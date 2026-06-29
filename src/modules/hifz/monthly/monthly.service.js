import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { findTenantRecordOrThrow, normalizeTenantId } from '../../../utils/tenantGuard.js';

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

const ensureStudent = async (tenantId, studentId) => {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw new AppError('Student not found.', 404);
};

const buildData = (payload, tenantId) => ({
  ...payload,
  tenantId,
  remarks: payload.remarks || null,
});

const notFoundMessage = 'Monthly jaiza entry not found.';

export const monthlyHifzService = {
  async createEntry(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStudent(resolvedTenantId, payload.studentId);

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

  async getEntries(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      student: { tenantId: resolvedTenantId },
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

  async getEntryById(tenantId, id) {
    return findTenantRecordOrThrow(prisma.hifzMonthlyEntry, tenantId, { id }, { select, message: notFoundMessage });
  },

  async updateEntry(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await findTenantRecordOrThrow(prisma.hifzMonthlyEntry, resolvedTenantId, { id }, { message: notFoundMessage });
    await ensureStudent(resolvedTenantId, payload.studentId);
    const duplicate = await prisma.hifzMonthlyEntry.findFirst({
      where: { tenantId: resolvedTenantId, id: { not: id }, studentId: payload.studentId, month: payload.month, year: payload.year },
    });
    if (duplicate) throw new AppError('Monthly jaiza for this student and month already exists.', 409);

    return prisma.hifzMonthlyEntry.update({
      where: { id },
      data: buildData(payload, resolvedTenantId),
      select,
    });
  },

  async deactivateEntry(tenantId, id) {
    await findTenantRecordOrThrow(prisma.hifzMonthlyEntry, tenantId, { id }, { message: notFoundMessage });
    return prisma.hifzMonthlyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
