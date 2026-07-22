import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const examScheduleSelect = {
  id: true,
  tenantId: true,
  examName: true,
  examDate: true,
  startTime: true,
  endTime: true,
  totalMarks: true,
  room: true,
  invigilator: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  session: { select: { id: true, name: true, startDate: true, endDate: true } },
  class: { select: { id: true, tenantId: true, name: true } },
  section: { select: { id: true, tenantId: true, classId: true, name: true } },
  subject: { select: { id: true, tenantId: true, name: true } },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeStartDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEndDate = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const ensureExamScheduleReferences = async (tenantId, { sessionId, classId, sectionId, subjectId }, branchId = null) => {
  const [session, academicClass, section, subject] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findFirst({
      where: { id: classId, tenantId, ...(branchId ? { branchId } : {}), branch: { status: 'active' } },
    }),
    prisma.section.findFirst({
      where: { id: sectionId, classId, tenantId, status: 'active' },
    }),
    prisma.subject.findFirst({ where: { id: subjectId, tenantId } }),
  ]);

  if (!session || session.status !== 'active') {
    throw new AppError('فعال سیشن نہیں ملا۔', 404);
  }

  if (!academicClass || academicClass.status !== 'active') {
    throw new AppError('فعال کلاس یا برانچ نہیں ملی۔', 404);
  }

  if (!section) {
    throw new AppError('فعال جماعت سیکشن نہیں ملا۔', 404);
  }

  if (!subject || subject.status !== 'active') {
    throw new AppError('فعال مضمون نہیں ملا۔', 404);
  }
};

const getTenantExamSchedule = async (tenantId, id, branchId = null) => {
  const schedule = await prisma.examSchedule.findFirst({
    where: { id, tenantId, class: { tenantId, ...(branchId ? { branchId } : {}) } },
    select: examScheduleSelect,
  });

  if (!schedule) {
    throw new AppError('امتحانی نظام الاوقات نہیں ملا۔', 404);
  }

  return schedule;
};

export const examSchedulesService = {
  async createExamSchedule(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureExamScheduleReferences(resolvedTenantId, payload, getScopedBranchId(branchScope));

    return prisma.examSchedule.create({
      data: {
        tenantId: resolvedTenantId,
        examName: payload.examName,
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        examDate: normalizeStartDate(payload.examDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        totalMarks: payload.totalMarks,
        room: payload.room,
        invigilator: payload.invigilator,
        notes: payload.notes,
        status: payload.status || 'active',
      },
      select: examScheduleSelect,
    });
  },

  async getExamSchedules(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getScopedBranchId(branchScope) || query.branchId || null;
    const where = {
      tenantId: resolvedTenantId,
      class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      subject: { tenantId: resolvedTenantId },
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.fromDate || query.toDate
        ? {
            examDate: {
              ...(query.fromDate ? { gte: normalizeStartDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeEndDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { examName: { contains: query.search } },
              { room: { contains: query.search } },
              { invigilator: { contains: query.search } },
              { notes: { contains: query.search } },
              { class: { name: { contains: query.search } } },
              { subject: { name: { contains: query.search } } },
            ],
          }
        : {}),
      status: query.status || 'active',
    };

    const [items, totalItems] = await Promise.all([
      prisma.examSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
        select: examScheduleSelect,
      }),
      prisma.examSchedule.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async updateExamSchedule(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await getTenantExamSchedule(resolvedTenantId, id, branchId);
    await ensureExamScheduleReferences(resolvedTenantId, payload, branchId);

    return prisma.examSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        examName: payload.examName,
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        examDate: normalizeStartDate(payload.examDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        totalMarks: payload.totalMarks,
        room: payload.room,
        invigilator: payload.invigilator,
        notes: payload.notes,
        status: payload.status || 'active',
      },
      select: examScheduleSelect,
    });
  },

  async deleteExamSchedule(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantExamSchedule(resolvedTenantId, id, getScopedBranchId(branchScope));

    return prisma.examSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: examScheduleSelect,
    });
  },
};
