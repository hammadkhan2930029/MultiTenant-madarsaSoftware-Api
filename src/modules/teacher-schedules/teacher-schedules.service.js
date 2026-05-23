import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const teacherScheduleSelect = {
  id: true,
  subjects: true,
  days: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, fullName: true, phone: true, subject: true } },
  session: { select: { id: true, name: true, startDate: true, endDate: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
};

const ensureTeacherScheduleReferences = async ({ teacherId, sessionId, classId, sectionId }) => {
  const [teacher, session, academicClass, section] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findUnique({ where: { id: classId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
  ]);

  if (!teacher || teacher.status !== 'active') {
    throw new AppError('Active teacher not found.', 404);
  }

  if (!session || session.status !== 'active') {
    throw new AppError('Active session not found.', 404);
  }

  if (!academicClass || academicClass.status !== 'active') {
    throw new AppError('Active class not found.', 404);
  }

  if (!section || section.status !== 'active') {
    throw new AppError('Active section not found.', 404);
  }

  if (section.classId !== classId) {
    throw new AppError('Section does not belong to the selected class.', 400);
  }
};

export const teacherSchedulesService = {
  async createTeacherSchedule(payload) {
    await ensureTeacherScheduleReferences(payload);

    return prisma.teacherSchedule.create({
      data: {
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

  async getTeacherSchedules(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
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

  async deleteTeacherSchedule(id) {
    const schedule = await prisma.teacherSchedule.findUnique({ where: { id } });

    if (!schedule) {
      throw new AppError('Schedule not found.', 404);
    }

    return prisma.teacherSchedule.update({
      where: { id },
      data: { status: 'inactive' },
      select: teacherScheduleSelect,
    });
  },
};
