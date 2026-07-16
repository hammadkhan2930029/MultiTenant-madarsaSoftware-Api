import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { findTenantRecordOrThrow, normalizeTenantId } from '../../../utils/tenantGuard.js';

const select = {
  id: true,
  tenantId: true,
  studentId: true,
  siparaNumber: true,
  startDate: true,
  endDate: true,
  totalDays: true,
  quality: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, tenantId: true, admissionNumber: true, fullName: true } },
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
  }

  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

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
  startDate: normalizeDate(payload.startDate),
  endDate: normalizeDate(payload.endDate),
  remarks: payload.remarks || null,
  quality: payload.quality || null,
  totalDays: payload.totalDays ?? null,
});

const notFoundMessage = 'Sipara jaiza entry not found.';

export const siparaHifzService = {
  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, branchId);

    return prisma.hifzSiparaEntry.upsert({
      where: {
        tenantId_studentId_siparaNumber: {
          tenantId: resolvedTenantId,
          studentId: payload.studentId,
          siparaNumber: payload.siparaNumber,
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
    const branchId = getScopedBranchId(branchScope) || query.branchId || null;
    const where = {
      tenantId: resolvedTenantId,
      student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.siparaNumber ? { siparaNumber: query.siparaNumber } : {}),
      ...(query.date
        ? {
            OR: [
              { startDate: normalizeDate(query.date) },
              { endDate: normalizeDate(query.date) },
            ],
          }
        : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzSiparaEntry.findMany({ where, skip, take: limit, orderBy: [{ siparaNumber: 'asc' }], select }),
      prisma.hifzSiparaEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const entry = await prisma.hifzSiparaEntry.findFirst({
      where: { id, tenantId: resolvedTenantId, student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) } },
      select,
    });
    if (!entry) throw new AppError(notFoundMessage, 404);
    return entry;
  },

  async updateEntry(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await this.getEntryById(resolvedTenantId, id, branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, getScopedBranchId(branchScope));
    const duplicate = await prisma.hifzSiparaEntry.findFirst({
      where: { tenantId: resolvedTenantId, id: { not: id }, studentId: payload.studentId, siparaNumber: payload.siparaNumber },
    });
    if (duplicate) throw new AppError('Sipara jaiza for this student and sipara already exists.', 409);

    return prisma.hifzSiparaEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: buildData(payload, resolvedTenantId),
      select,
    });
  },

  async deactivateEntry(tenantId, id, branchScope = null) {
    await this.getEntryById(tenantId, id, branchScope);
    return prisma.hifzSiparaEntry.update({ where: { id, tenantId: normalizeTenantId(tenantId) }, data: { status: 'inactive' }, select });
  },
};
