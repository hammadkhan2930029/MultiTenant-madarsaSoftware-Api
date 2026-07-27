import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { findTenantRecordOrThrow, normalizeTenantId } from '../../../utils/tenantGuard.js';
import { branchScopeService } from '../../security/index.js';

const select = {
  id: true,
  tenantId: true,
  studentId: true,
  month: true,
  year: true,
  startSabq: true,
  endSabq: true,
  totalRecitation: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, tenantId: true, admissionNumber: true, fullName: true } },
};

const resolveHifzBranchId = (tenantId, queryOrPayload = {}, branchScope = null) =>
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });

const buildStudentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};
  return { OR: [{ branchId }, { assignments: { some: { tenantId, branchId, status: 'active' } } }] };
};

const ensureStudent = async (tenantId, studentId, branchId = null) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, ...buildStudentBranchVisibilityWhere(tenantId, branchId) },
  });
  if (!student) throw new AppError('Student not found.', 404);
};

const buildData = (payload, tenantId) => ({
  ...payload,
  tenantId,
  remarks: payload.remarks || null,
});

const notFoundMessage = 'Monthly jaiza entry not found.';

export const monthlyHifzService = {
  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveHifzBranchId(resolvedTenantId, payload, branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, branchId);

    return prisma.hifzMonthlyEntry.upsert({
      where: {
        tenantId_studentId_month_year: {
          tenantId: resolvedTenantId,
          studentId: payload.studentId,
          month: payload.month,
          year: payload.year,
        },
      },
      create: buildData(payload, resolvedTenantId),
      update: buildData(payload, resolvedTenantId),
      select,
    });
  },

  async getEntries(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = await resolveHifzBranchId(resolvedTenantId, query, branchScope);
    const where = {
      tenantId: resolvedTenantId,
      student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzMonthlyEntry.findMany({ where, skip, take: limit, orderBy: [{ year: 'desc' }, { month: 'desc' }], select }),
      prisma.hifzMonthlyEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveHifzBranchId(resolvedTenantId, {}, branchScope);
    const entry = await prisma.hifzMonthlyEntry.findFirst({
      where: { id, tenantId: resolvedTenantId, student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) } },
      select,
    });
    if (!entry) throw new AppError(notFoundMessage, 404);
    return entry;
  },

  async updateEntry(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await this.getEntryById(resolvedTenantId, id, branchScope);
    const branchId = await resolveHifzBranchId(resolvedTenantId, payload, branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, branchId);
    const duplicate = await prisma.hifzMonthlyEntry.findFirst({
      where: { tenantId: resolvedTenantId, id: { not: id }, studentId: payload.studentId, month: payload.month, year: payload.year },
    });
    if (duplicate) throw new AppError('Monthly jaiza for this student and month already exists.', 409);

    return prisma.hifzMonthlyEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: buildData(payload, resolvedTenantId),
      select,
    });
  },

  async deactivateEntry(tenantId, id, branchScope = null) {
    await this.getEntryById(tenantId, id, branchScope);
    return prisma.hifzMonthlyEntry.update({ where: { id, tenantId: normalizeTenantId(tenantId) }, data: { status: 'inactive' }, select });
  },
};
