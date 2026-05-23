import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  siparaNumber: true,
  startDate: true,
  endDate: true,
  totalDays: true,
  quality: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
};
const normalizeDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
  }

  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};
const ensureStudent = async (studentId) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new AppError('Student not found.', 404);
};

export const siparaHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    return prisma.hifzSiparaEntry.upsert({
      where: { studentId_siparaNumber: { studentId: payload.studentId, siparaNumber: payload.siparaNumber } },
      create: { ...payload, startDate: normalizeDate(payload.startDate), endDate: normalizeDate(payload.endDate), remarks: payload.remarks || null, quality: payload.quality || null, totalDays: payload.totalDays ?? null },
      update: { ...payload, startDate: normalizeDate(payload.startDate), endDate: normalizeDate(payload.endDate), remarks: payload.remarks || null, quality: payload.quality || null, totalDays: payload.totalDays ?? null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.siparaNumber ? { siparaNumber: query.siparaNumber } : {}),
      ...(query.date
        ? {
            OR: [
              { startDate: normalizeDate(query.date) },
              { endDate: normalizeDate(query.date) },
            ],
          }
        : {}),
      ...(query.performanceStatus ? { performanceStatus: query.performanceStatus } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.hifzSiparaEntry.findMany({ where, skip, take: limit, orderBy: [{ siparaNumber: 'asc' }], select }),
      prisma.hifzSiparaEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(id) {
    const entry = await prisma.hifzSiparaEntry.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Sipara jaiza entry not found.', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.hifzSiparaEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Sipara jaiza entry not found.', 404);
    await ensureStudent(payload.studentId);
    const duplicate = await prisma.hifzSiparaEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, siparaNumber: payload.siparaNumber },
    });
    if (duplicate) throw new AppError('Sipara jaiza for this student and sipara already exists.', 409);
    return prisma.hifzSiparaEntry.update({
      where: { id },
      data: { ...payload, startDate: normalizeDate(payload.startDate), endDate: normalizeDate(payload.endDate), remarks: payload.remarks || null, quality: payload.quality || null, totalDays: payload.totalDays ?? null },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.hifzSiparaEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Sipara jaiza entry not found.', 404);
    return prisma.hifzSiparaEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
