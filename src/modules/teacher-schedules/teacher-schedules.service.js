import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const teacherScheduleSelect = {
  id: true,
  tenantId: true,
  subjects: true,
  days: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, tenantId: true, fullName: true, phone: true, subject: true } },
  session: { select: { id: true, name: true, startDate: true, endDate: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const ensureTeacherScheduleReferences = async (tenantId, { teacherId, sessionId, classId, sectionId }, branchId = null) => {
  const [teacher, session, academicClass, section] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, tenantId, ...(branchId ? { branchId } : {}) } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findFirst({
      where: { id: classId, tenantId, ...(branchId ? { branchId } : {}), branch: { status: 'active' } },
    }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId } }),
  ]);

  if (!teacher || teacher.status !== 'active') {
    throw new AppError('فعال استاد نہیں ملا۔', 404);
  }

  if (!session || session.status !== 'active') {
    throw new AppError('فعال سیشن نہیں ملا۔', 404);
  }

  if (!academicClass || academicClass.status !== 'active') {
    throw new AppError('فعال کلاس نہیں ملی۔', 404);
  }

  if (!section || section.status !== 'active') {
    throw new AppError('فعال سیکشن نہیں ملا۔', 404);
  }

  if (section.classId !== classId) {
    throw new AppError('یہ سیکشن منتخب کلاس سے متعلق نہیں ہے۔', 400);
  }
  if (teacher.branchId && teacher.branchId !== academicClass.branchId) {
    throw new AppError('Selected teacher does not belong to the selected class branch.', 400);
  }
};

export const teacherSchedulesService = {
  async createTeacherSchedule(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureTeacherScheduleReferences(resolvedTenantId, payload, getScopedBranchId(branchScope));

    return prisma.teacherSchedule.create({
      data: {
        tenantId: resolvedTenantId,
        teacherId: payload.teacherId,
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjects: payload.subjects,
        days: payload.days,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status || 'active',
      },
      select: teacherScheduleSelect,
    });
  },

  async getTeacherSchedules(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getScopedBranchId(branchScope) || query.branchId || null;
    const where = {
      tenantId: resolvedTenantId,
      teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      section: { tenantId: resolvedTenantId },
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      status: query.status || 'active',
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacherSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: teacherScheduleSelect,
      }),
      prisma.teacherSchedule.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async updateTeacherSchedule(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const existingSchedule = await prisma.teacherSchedule.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
        class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
        section: { tenantId: resolvedTenantId },
      },
    });

    if (!existingSchedule) {
      throw new AppError('Ø´ÛŒÚˆÙˆÙ„ Ù†ÛÛŒÚº Ù…Ù„Ø§Û”', 404);
    }

    await ensureTeacherScheduleReferences(resolvedTenantId, payload, branchId);

    return prisma.teacherSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        tenantId: resolvedTenantId,
        teacherId: payload.teacherId,
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjects: payload.subjects,
        days: payload.days,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status || existingSchedule.status,
      },
      select: teacherScheduleSelect,
    });
  },

  async deleteTeacherSchedule(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const schedule = await prisma.teacherSchedule.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
        class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
        section: { tenantId: resolvedTenantId },
      },
    });

    if (!schedule) {
      throw new AppError('شیڈول نہیں ملا۔', 404);
    }

    return prisma.teacherSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: teacherScheduleSelect,
    });
  },
};
