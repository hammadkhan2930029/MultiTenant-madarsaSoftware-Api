import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  month: true,
  year: true,
  startSabq: true,
  endSabq: true,
  totalRecitation: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
};
const ensureStudent = async (studentId) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new AppError('Student not found.', 404);
};

export const monthlyHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    return prisma.hifzMonthlyEntry.upsert({
      where: { studentId_month_year: { studentId: payload.studentId, month: payload.month, year: payload.year } },
      create: { ...payload, remarks: payload.remarks || null },
      update: { ...payload, remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzMonthlyEntry.findMany({ where, skip, take: limit, orderBy: [{ year: 'desc' }, { month: 'desc' }], select }),
      prisma.hifzMonthlyEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(id) {
    const entry = await prisma.hifzMonthlyEntry.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Monthly jaiza entry not found.', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.hifzMonthlyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Monthly jaiza entry not found.', 404);
    await ensureStudent(payload.studentId);
    const duplicate = await prisma.hifzMonthlyEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, month: payload.month, year: payload.year },
    });
    if (duplicate) throw new AppError('Monthly jaiza for this student and month already exists.', 409);
    return prisma.hifzMonthlyEntry.update({ where: { id }, data: { ...payload, remarks: payload.remarks || null }, select });
  },
  async deactivateEntry(id) {
    const existing = await prisma.hifzMonthlyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Monthly jaiza entry not found.', 404);
    return prisma.hifzMonthlyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
