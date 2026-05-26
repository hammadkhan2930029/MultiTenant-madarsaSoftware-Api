import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const examScheduleSelect = {
  id: true,
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
  class: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
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

const ensureExamScheduleReferences = async ({ sessionId, classId, subjectId }) => {
  const [session, academicClass, subject] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findUnique({ where: { id: classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
  ]);

  if (!session || session.status !== 'active') {
    throw new AppError('Active session not found.', 404);
  }

  if (!academicClass || academicClass.status !== 'active') {
    throw new AppError('Active class not found.', 404);
  }

  if (!subject || subject.status !== 'active') {
    throw new AppError('Active subject not found.', 404);
  }
};

export const examSchedulesService = {
  async createExamSchedule(payload) {
    await ensureExamScheduleReferences(payload);

    return prisma.examSchedule.create({
      data: {
        examName: payload.examName,
        sessionId: payload.sessionId,
        classId: payload.classId,
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

  async getExamSchedules(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
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

  async deleteExamSchedule(id) {
    const schedule = await prisma.examSchedule.findUnique({ where: { id } });

    if (!schedule) {
      throw new AppError('Exam schedule not found.', 404);
    }

    return prisma.examSchedule.update({
      where: { id },
      data: { status: 'inactive' },
      select: examScheduleSelect,
    });
  },
};
