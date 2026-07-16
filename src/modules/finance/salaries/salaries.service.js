import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { branchScopeService } from '../../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const select = {
  id: true,
  tenantId: true,
  branchId: true,
  amount: true,
  salaryMonth: true,
  salaryYear: true,
  paymentDate: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, tenantId: true, fullName: true, phone: true, subject: true } },
  financeHead: { select: { id: true, name: true, type: true } },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || payloadOrQuery.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

const ensureReferences = async (tenantId, { teacherId, financeHeadId }, branchId = null) => {
  const [teacher, head] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, tenantId, ...(branchId ? { branchId } : {}) } }),
    prisma.financeHead.findFirst({ where: { id: financeHeadId, tenantId } }),
  ]);
  if (!teacher) throw new AppError('Teacher not found.', 404);
  if (!head) throw new AppError('Finance head not found.', 404);
  if (head.type !== 'expense') throw new AppError('Selected finance head must be an expense head.', 400);
};

export const salariesService = {
  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    await ensureReferences(resolvedTenantId, payload, branchId);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: {
        teacherId: payload.teacherId,
        tenantId: resolvedTenantId,
        salaryMonth: payload.salaryMonth,
        salaryYear: payload.salaryYear,
        teacher: { tenantId: resolvedTenantId },
        ...(branchId ? { branchId } : {}),
      },
    });
    if (duplicate) throw new AppError('Salary entry for this teacher and month already exists.', 409);
    return prisma.salaryEntry.create({
      data: { ...payload, tenantId: resolvedTenantId, branchId, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.salaryMonth ? { salaryMonth: query.salaryMonth } : {}),
      ...(query.salaryYear ? { salaryYear: query.salaryYear } : {}),
      ...(query.fromDate || query.toDate
        ? {
            paymentDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.salaryEntry.findMany({ where, skip, take: limit, orderBy: [{ salaryYear: 'desc' }, { salaryMonth: 'desc' }], select }),
      prisma.salaryEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const entry = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } }, select });
    if (!entry) throw new AppError('Salary entry not found.', 404);
    return entry;
  },
  async updateEntry(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const existing = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    await ensureReferences(resolvedTenantId, payload, branchId);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: {
        id: { not: id },
        tenantId: resolvedTenantId,
        teacherId: payload.teacherId,
        salaryMonth: payload.salaryMonth,
        salaryYear: payload.salaryYear,
        teacher: { tenantId: resolvedTenantId },
        ...(branchId ? { branchId } : {}),
      },
    });
    if (duplicate) throw new AppError('Another salary entry for this teacher and month already exists.', 409);
    return prisma.salaryEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: { ...payload, branchId, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null, status: payload.status || existing.status },
      select,
    });
  },
  async deactivateEntry(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const existing = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    return prisma.salaryEntry.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
  },
};
