import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  date: true,
  sabq: true,
  sabaqi: true,
  manzil: true,
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

export const dailyHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    const date = normalizeDate(payload.date);
    return prisma.hifzDailyEntry.upsert({
      where: { studentId_date: { studentId: payload.studentId, date } },
      create: { ...payload, date, remarks: payload.remarks || null },
      update: { ...payload, date, remarks: payload.remarks || null },
      select,
    });
  },

  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
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

  async getEntryById(id) {
    const entry = await prisma.hifzDailyEntry.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Daily jaiza entry not found.', 404);
    return entry;
  },

  async updateEntry(id, payload) {
    const existing = await prisma.hifzDailyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Daily jaiza entry not found.', 404);
    await ensureStudent(payload.studentId);
    const duplicate = await prisma.hifzDailyEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, date: normalizeDate(payload.date) },
    });
    if (duplicate) throw new AppError('Daily jaiza for this student and date already exists.', 409);
    return prisma.hifzDailyEntry.update({
      where: { id },
      data: { ...payload, date: normalizeDate(payload.date), remarks: payload.remarks || null },
      select,
    });
  },

  async deactivateEntry(id) {
    const existing = await prisma.hifzDailyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Daily jaiza entry not found.', 404);
    return prisma.hifzDailyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
