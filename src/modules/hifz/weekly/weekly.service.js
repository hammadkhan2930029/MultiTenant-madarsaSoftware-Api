import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  weekStartDate: true,
  weekEndDate: true,
  siparaFrom: true,
  siparaTo: true,
  lessonFrom: true,
  lessonTo: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
const ensureStudent = async (studentId) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new AppError('Student not found.', 404);
};

export const weeklyHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    return prisma.hifzWeeklyEntry.upsert({
      where: { studentId_weekStartDate_weekEndDate: { studentId: payload.studentId, weekStartDate, weekEndDate } },
      create: { ...payload, weekStartDate, weekEndDate, remarks: payload.remarks || null },
      update: { ...payload, weekStartDate, weekEndDate, remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
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
  async getEntryById(id) {
    const entry = await prisma.hifzWeeklyEntry.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Weekly jaiza entry not found.', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.hifzWeeklyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Weekly jaiza entry not found.', 404);
    await ensureStudent(payload.studentId);
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    const duplicate = await prisma.hifzWeeklyEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, weekStartDate, weekEndDate },
    });
    if (duplicate) throw new AppError('Weekly jaiza for this student and week already exists.', 409);
    return prisma.hifzWeeklyEntry.update({
      where: { id },
      data: { ...payload, weekStartDate, weekEndDate, remarks: payload.remarks || null },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.hifzWeeklyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Weekly jaiza entry not found.', 404);
    return prisma.hifzWeeklyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
