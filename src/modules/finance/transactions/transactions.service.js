import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { auditService, branchScopeService } from '../../security/index.js';

const select = {
  id: true,
  tenantId: true,
  branchId: true,
  financeHeadId: true,
  type: true,
  amount: true,
  transactionDate: true,
  paymentMode: true,
  paymentStatus: true,
  slipNo: true,
  details: true,
  referenceType: true,
  referenceId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  financeHead: { select: { id: true, tenantId: true, name: true, type: true } },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('Date is required.', 400);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEndDate = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toAmount = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeText = (value) => String(value || '').trim();

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || payloadOrQuery.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

const recordFinanceAudit = (entry, auditContext = {}) => auditService.recordAuditLog(prisma, {
  tenantId: entry.tenantId,
  actorUserId: auditContext.actorUserId || null,
  branchId: entry.branchId || auditContext.branchId || null,
  roleId: auditContext.roleId || null,
  module: 'finance',
  targetType: 'finance_transaction',
  targetId: entry.id,
  ipAddress: auditContext.ipAddress || null,
  userAgent: auditContext.userAgent || null,
  ...entry,
});

const ensureHead = async (tenantId, { financeHeadId, type }) => {
  const head = await prisma.financeHead.findFirst({ where: { id: financeHeadId, tenantId } });
  if (!head) throw new AppError('Finance head not found.', 404);
  if (head.status !== 'active') throw new AppError('Selected finance head is inactive.', 400);
  if (head.type !== type) throw new AppError('Selected finance head does not match income/expense type.', 400);
};

const getOrCreateExpenseHead = async (tenantId, category) => {
  const headName = normalizeText(category);
  if (!headName) throw new AppError('Expense category is required.', 400);

  const existing = await prisma.$queryRaw`
    SELECT id
    FROM finance_heads
    WHERE tenant_id = ${tenantId} AND name = ${headName}
    LIMIT 1
  `;
  if (existing.length) return Number(existing[0].id);

  await prisma.$executeRaw`
    INSERT INTO finance_heads (tenant_id, name, type, description, status, createdAt, updatedAt)
    VALUES (${tenantId}, ${headName}, 'expense', ${headName}, 'active', ${new Date()}, ${new Date()})
  `;
  const rows = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
  return Number(rows[0].id);
};

const mapExpense = (row) => ({
  id: Number(row.id),
  tenantId: row.tenant_id === null || row.tenant_id === undefined ? null : Number(row.tenant_id),
  branchId: row.branch_id === null || row.branch_id === undefined ? null : Number(row.branch_id),
  title: row.details,
  category: row.category,
  amount: toAmount(row.amount),
  paymentMethod: row.paymentMode,
  referenceType: row.referenceType,
  referenceId: row.referenceId === null || row.referenceId === undefined ? null : Number(row.referenceId),
  date: row.transactionDate,
  note: row.slipNo,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const transactionsService = {
  async createExpense(tenantId, payload, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const title = normalizeText(payload.title);
    const category = normalizeText(payload.category) || 'General Expenses';
    const amount = toAmount(payload.amount);
    const date = normalizeDate(payload.date);
    const paymentMethod = normalizeText(payload.paymentMethod) || null;
    const referenceType = normalizeText(payload.referenceType) || null;
    const referenceId = payload.referenceId ? Number(payload.referenceId) : null;
    const note = normalizeText(payload.note) || null;

    if (!title) throw new AppError('Expense title is required.', 400);
    if (amount <= 0) throw new AppError('Amount must be greater than zero.', 400);
    if (referenceId && (!Number.isInteger(referenceId) || referenceId <= 0)) throw new AppError('Invalid reference.', 400);

    const financeHeadId = await getOrCreateExpenseHead(resolvedTenantId, category);
    const existing = referenceType && referenceId
      ? await prisma.$queryRaw`
          SELECT id
          FROM finance_transactions
          WHERE tenant_id = ${resolvedTenantId}
            AND (${branchId} IS NULL OR branch_id = ${branchId})
            AND referenceType = ${referenceType}
            AND referenceId = ${referenceId}
          LIMIT 1
        `
      : [];

    if (existing.length) {
      const id = Number(existing[0].id);
      const oldEntry = await this.getExpenseById(resolvedTenantId, id, branchScope);
      await prisma.$executeRaw`
        UPDATE finance_transactions
        SET financeHeadId = ${financeHeadId},
            branch_id = ${branchId},
            type = 'expense',
            amount = ${amount},
            transactionDate = ${date},
            paymentMode = ${paymentMethod},
            paymentStatus = 'مکمل',
            slipNo = ${note},
            details = ${title},
            status = 'active',
            updatedAt = ${new Date()}
        WHERE id = ${id} AND tenant_id = ${resolvedTenantId}
      `;
      const updatedEntry = await this.getExpenseById(resolvedTenantId, id, branchScope);
      await recordFinanceAudit({
        tenantId: resolvedTenantId,
        branchId,
        action: 'finance.expense.updated',
        oldValue: oldEntry,
        newValue: updatedEntry,
        id,
      }, auditContext);
      return updatedEntry;
    }

    await prisma.$executeRaw`
      INSERT INTO finance_transactions (tenant_id, branch_id, financeHeadId, type, amount, transactionDate, paymentMode, paymentStatus, slipNo, details, referenceType, referenceId, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${branchId}, ${financeHeadId}, 'expense', ${amount}, ${date}, ${paymentMethod}, 'مکمل', ${note}, ${title}, ${referenceType}, ${referenceId}, 'active', ${new Date()}, ${new Date()})
    `;
    const rows = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
    const createdEntry = await this.getExpenseById(resolvedTenantId, Number(rows[0].id), branchScope);
    await recordFinanceAudit({
      tenantId: resolvedTenantId,
      branchId,
      action: 'finance.expense.created',
      oldValue: null,
      newValue: createdEntry,
      id: createdEntry.id,
    }, auditContext);
    return createdEntry;
  },

  async getExpenseById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const rows = await prisma.$queryRaw`
      SELECT ft.*, fh.name AS category
      FROM finance_transactions ft
      JOIN finance_heads fh ON fh.id = ft.financeHeadId
      WHERE ft.id = ${id}
        AND ft.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ft.branch_id = ${branchId})
        AND ft.type = 'expense'
      LIMIT 1
    `;
    if (!rows.length) throw new AppError('Expense record not found.', 404);
    return mapExpense(rows[0]);
  },

  async getExpenses(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const category = normalizeText(query.category);
    const rows = await prisma.$queryRaw`
      SELECT ft.*, fh.name AS category
      FROM finance_transactions ft
      JOIN finance_heads fh ON fh.id = ft.financeHeadId
      WHERE ft.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ft.branch_id = ${branchId})
        AND ft.type = 'expense'
        AND ft.status = 'active'
        AND (${category} = '' OR fh.name = ${category})
      ORDER BY ft.transactionDate DESC, ft.id DESC
    `;
    return { items: rows.map(mapExpense), meta: null };
  },

  async createEntry(tenantId, payload, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    await ensureHead(resolvedTenantId, payload);

    const entry = await prisma.financeTransaction.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        branchId,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
      },
      select,
    });
    await recordFinanceAudit({
      tenantId: resolvedTenantId,
      branchId,
      action: 'finance.transaction.created',
      oldValue: null,
      newValue: entry,
      id: entry.id,
    }, auditContext);
    return entry;
  },

  async getEntries(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      ...(query.financeHeadId ? { financeHeadId: query.financeHeadId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { slipNo: { contains: query.search } },
              { details: { contains: query.search } },
              { financeHead: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            transactionDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeEndDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.financeTransaction.findMany({ where, skip, take: limit, orderBy: { transactionDate: 'desc' }, select }),
      prisma.financeTransaction.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async updateEntry(tenantId, id, payload, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const existing = await prisma.financeTransaction.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } });
    if (!existing) throw new AppError('Finance record not found.', 404);
    await ensureHead(resolvedTenantId, payload);

    const entry = await prisma.financeTransaction.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        ...payload,
        branchId,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
        status: payload.status || existing.status,
      },
      select,
    });
    await recordFinanceAudit({
      tenantId: resolvedTenantId,
      branchId: entry.branchId || branchId,
      action: 'finance.transaction.updated',
      oldValue: existing,
      newValue: entry,
      id: entry.id,
    }, auditContext);
    return entry;
  },

  async deactivateEntry(tenantId, id, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const existing = await prisma.financeTransaction.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } });
    if (!existing) throw new AppError('Finance record not found.', 404);

    const entry = await prisma.financeTransaction.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
    await recordFinanceAudit({
      tenantId: resolvedTenantId,
      branchId: entry.branchId || branchId,
      action: 'finance.transaction.deactivated',
      oldValue: existing,
      newValue: entry,
      id: entry.id,
    }, auditContext);
    return entry;
  },
};
