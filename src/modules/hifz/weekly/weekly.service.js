import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { findTenantRecordOrThrow, normalizeTenantId } from '../../../utils/tenantGuard.js';

const select = {
  id: true,
  tenantId: true,
  studentId: true,
  weekLabel: true,
  className: true,
  sectionName: true,
  teacherName: true,
  weekStartDate: true,
  weekEndDate: true,
  siparaFrom: true,
  siparaTo: true,
  lessonFrom: true,
  lessonTo: true,
  sawal1: true,
  sawal2: true,
  sawal3: true,
  tahajji: true,
  panja: true,
  khudKhwani: true,
  classWork: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, tenantId: true, admissionNumber: true, fullName: true } },
};

const nullableFields = [
  'weekLabel',
  'className',
  'sectionName',
  'teacherName',
  'siparaFrom',
  'siparaTo',
  'lessonFrom',
  'lessonTo',
  'sawal1',
  'sawal2',
  'sawal3',
  'tahajji',
  'panja',
  'khudKhwani',
  'classWork',
  'remarks',
];

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
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

const normalizePayload = (payload) => {
  const data = { ...payload };

  nullableFields.forEach((field) => {
    if (data[field] === undefined || data[field] === '') {
      data[field] = null;
    }
  });

  return data;
};

const notFoundMessage = 'Weekly hifz entry not found.';

export const weeklyHifzService = {
  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, branchId);
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    const data = normalizePayload(payload);

    return prisma.hifzWeeklyEntry.upsert({
      where: {
        tenantId_studentId_weekStartDate_weekEndDate: {
          tenantId: resolvedTenantId,
          studentId: payload.studentId,
          weekStartDate,
          weekEndDate,
        },
      },
      create: { ...data, tenantId: resolvedTenantId, weekStartDate, weekEndDate },
      update: { ...data, tenantId: resolvedTenantId, weekStartDate, weekEndDate },
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
      ...(query.date
        ? {
            AND: [
              { weekStartDate: { lte: normalizeDate(query.date) } },
              { weekEndDate: { gte: normalizeDate(query.date) } },
            ],
          }
        : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzWeeklyEntry.findMany({ where, skip, take: limit, orderBy: [{ weekStartDate: 'desc' }], select }),
      prisma.hifzWeeklyEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const entry = await prisma.hifzWeeklyEntry.findFirst({
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
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    const duplicate = await prisma.hifzWeeklyEntry.findFirst({
      where: { tenantId: resolvedTenantId, id: { not: id }, studentId: payload.studentId, weekStartDate, weekEndDate },
    });
    if (duplicate) throw new AppError('Weekly hifz entry already exists for this student and week.', 409);

    return prisma.hifzWeeklyEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: { ...normalizePayload(payload), tenantId: resolvedTenantId, weekStartDate, weekEndDate },
      select,
    });
  },

  async deactivateEntry(tenantId, id, branchScope = null) {
    await this.getEntryById(tenantId, id, branchScope);
    return prisma.hifzWeeklyEntry.update({ where: { id, tenantId: normalizeTenantId(tenantId) }, data: { status: 'inactive' }, select });
  },
};
