import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { findTenantRecordOrThrow, normalizeTenantId } from '../../../utils/tenantGuard.js';

const select = {
  id: true,
  tenantId: true,
  studentId: true,
  date: true,
  sabq: true,
  sabqListener: true,
  sabqRuku: true,
  sabqAyatFrom: true,
  sabqAyatTo: true,
  sabqTeacherName: true,
  sabqMistake: true,
  sabqAtkann: true,
  sabaqi: true,
  sabaqiRuku: true,
  sabaqiAyatFrom: true,
  sabaqiAyatTo: true,
  sabaqiMistake: true,
  sabaqiAtkann: true,
  manzil: true,
  manzilBeforeDetail: true,
  manzilBeforePara: true,
  manzilBeforeRuku: true,
  manzilBeforeAyatFrom: true,
  manzilBeforeAyatTo: true,
  manzilBeforeMistake: true,
  manzilBeforeAtkann: true,
  manzilAfterDetail: true,
  manzilAfterPara: true,
  manzilAfterRuku: true,
  manzilAfterAyatFrom: true,
  manzilAfterAyatTo: true,
  manzilAfterMistake: true,
  manzilAfterAtkann: true,
  lessonDetail: true,
  count: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, tenantId: true, admissionNumber: true, fullName: true } },
};

const nullableFields = [
  'sabq',
  'sabqListener',
  'sabqRuku',
  'sabqAyatFrom',
  'sabqAyatTo',
  'sabqTeacherName',
  'sabqMistake',
  'sabqAtkann',
  'sabaqi',
  'sabaqiRuku',
  'sabaqiAyatFrom',
  'sabaqiAyatTo',
  'sabaqiMistake',
  'sabaqiAtkann',
  'manzil',
  'manzilBeforeDetail',
  'manzilBeforePara',
  'manzilBeforeRuku',
  'manzilBeforeAyatFrom',
  'manzilBeforeAyatTo',
  'manzilBeforeMistake',
  'manzilBeforeAtkann',
  'manzilAfterDetail',
  'manzilAfterPara',
  'manzilAfterRuku',
  'manzilAfterAyatFrom',
  'manzilAfterAyatTo',
  'manzilAfterMistake',
  'manzilAfterAtkann',
  'lessonDetail',
  'count',
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

const notFoundMessage = 'Daily hifz entry not found.';

export const dailyHifzService = {
  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStudent(resolvedTenantId, payload.studentId, branchId);
    const date = normalizeDate(payload.date);
    const data = normalizePayload(payload);

    return prisma.hifzDailyEntry.upsert({
      where: { tenantId_studentId_date: { tenantId: resolvedTenantId, studentId: payload.studentId, date } },
      create: { ...data, tenantId: resolvedTenantId, date },
      update: { ...data, tenantId: resolvedTenantId, date },
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
      ...(query.date ? { date: normalizeDate(query.date) } : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzDailyEntry.findMany({ where, skip, take: limit, orderBy: [{ date: 'desc' }], select }),
      prisma.hifzDailyEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const entry = await prisma.hifzDailyEntry.findFirst({
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
    const date = normalizeDate(payload.date);
    const duplicate = await prisma.hifzDailyEntry.findFirst({
      where: { tenantId: resolvedTenantId, id: { not: id }, studentId: payload.studentId, date },
    });
    if (duplicate) throw new AppError('Daily hifz entry already exists for this student and date.', 409);

    return prisma.hifzDailyEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: { ...normalizePayload(payload), tenantId: resolvedTenantId, date },
      select,
    });
  },

  async deactivateEntry(tenantId, id, branchScope = null) {
    await this.getEntryById(tenantId, id, branchScope);
    return prisma.hifzDailyEntry.update({ where: { id, tenantId: normalizeTenantId(tenantId) }, data: { status: 'inactive' }, select });
  },
};
