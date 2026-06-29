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

const ensureTeacherScheduleReferences = async (tenantId, { teacherId, sessionId, classId, sectionId }) => {
  const [teacher, session, academicClass, section] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, tenantId } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findFirst({ where: { id: classId, tenantId } }),
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
};

export const teacherSchedulesService = {
  async createTeacherSchedule(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureTeacherScheduleReferences(resolvedTenantId, payload);

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

  async getTeacherSchedules(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      teacher: { tenantId: resolvedTenantId },
      class: { tenantId: resolvedTenantId },
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

  async deleteTeacherSchedule(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const schedule = await prisma.teacherSchedule.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        teacher: { tenantId: resolvedTenantId },
        class: { tenantId: resolvedTenantId },
        section: { tenantId: resolvedTenantId },
      },
    });

    if (!schedule) {
      throw new AppError('شیڈول نہیں ملا۔', 404);
    }

    return prisma.teacherSchedule.update({
      where: { id },
      data: { status: 'inactive' },
      select: teacherScheduleSelect,
    });
  },
};
