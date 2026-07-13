import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  tenantId: true,
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
  async createExpense(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
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
            AND referenceType = ${referenceType}
            AND referenceId = ${referenceId}
          LIMIT 1
        `
      : [];

    if (existing.length) {
      const id = Number(existing[0].id);
      await prisma.$executeRaw`
        UPDATE finance_transactions
        SET financeHeadId = ${financeHeadId},
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
      return this.getExpenseById(resolvedTenantId, id);
    }

    await prisma.$executeRaw`
      INSERT INTO finance_transactions (tenant_id, financeHeadId, type, amount, transactionDate, paymentMode, paymentStatus, slipNo, details, referenceType, referenceId, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${financeHeadId}, 'expense', ${amount}, ${date}, ${paymentMethod}, 'مکمل', ${note}, ${title}, ${referenceType}, ${referenceId}, 'active', ${new Date()}, ${new Date()})
    `;
    const rows = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
    return this.getExpenseById(resolvedTenantId, Number(rows[0].id));
  },

  async getExpenseById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const rows = await prisma.$queryRaw`
      SELECT ft.*, fh.name AS category
      FROM finance_transactions ft
      JOIN finance_heads fh ON fh.id = ft.financeHeadId
      WHERE ft.id = ${id}
        AND ft.tenant_id = ${resolvedTenantId}
        AND ft.type = 'expense'
      LIMIT 1
    `;
    if (!rows.length) throw new AppError('Expense record not found.', 404);
    return mapExpense(rows[0]);
  },

  async getExpenses(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const category = normalizeText(query.category);
    const rows = await prisma.$queryRaw`
      SELECT ft.*, fh.name AS category
      FROM finance_transactions ft
      JOIN finance_heads fh ON fh.id = ft.financeHeadId
      WHERE ft.tenant_id = ${resolvedTenantId}
        AND ft.type = 'expense'
        AND ft.status = 'active'
        AND (${category} = '' OR fh.name = ${category})
      ORDER BY ft.transactionDate DESC, ft.id DESC
    `;
    return { items: rows.map(mapExpense), meta: null };
  },

  async createEntry(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureHead(resolvedTenantId, payload);

    return prisma.financeTransaction.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
      },
      select,
    });
  },

  async getEntries(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
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

  async updateEntry(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await prisma.financeTransaction.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!existing) throw new AppError('Finance record not found.', 404);
    await ensureHead(resolvedTenantId, payload);

    return prisma.financeTransaction.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        ...payload,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
        status: payload.status || existing.status,
      },
      select,
    });
  },

  async deactivateEntry(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await prisma.financeTransaction.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!existing) throw new AppError('Finance record not found.', 404);

    return prisma.financeTransaction.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
  },
};
