import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const scheduleSelect = {
  id: true,
  subjects: true,
  days: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  session: { select: { id: true, name: true, startDate: true, endDate: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
};

const ensureScheduleReferences = async ({ sessionId, classId, sectionId }) => {
  const [session, academicClass, section] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findUnique({ where: { id: classId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
  ]);

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

export const schedulesService = {
  async createSchedule(payload) {
    await ensureScheduleReferences(payload);

    return prisma.studentSchedule.create({
      data: {
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjects: payload.subjects,
        days: payload.days,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status || 'active',
      },
      select: scheduleSelect,
    });
  },

  async getSchedules(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      status: query.status || 'active',
    };

    const [items, totalItems] = await Promise.all([
      prisma.studentSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: scheduleSelect,
      }),
      prisma.studentSchedule.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async deleteSchedule(id) {
    const schedule = await prisma.studentSchedule.findUnique({ where: { id } });

    if (!schedule) {
      throw new AppError('Schedule not found.', 404);
    }

    return prisma.studentSchedule.update({
      where: { id },
      data: { status: 'inactive' },
      select: scheduleSelect,
    });
  },
};
