import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  weekLabel: true,
  className: true,
  sectionName: true,
  teacherName: true,
  weekStartDate: true,
  weekEndDate: true,
  siparaFrom: true,
  siparaTo: true,
  lessonFrom: true,
  lessonTo: true,
  sawal1: true,
  sawal2: true,
  sawal3: true,
  tahajji: true,
  panja: true,
  khudKhwani: true,
  classWork: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
};

const nullableFields = [
  'weekLabel',
  'className',
  'sectionName',
  'teacherName',
  'siparaFrom',
  'siparaTo',
  'lessonFrom',
  'lessonTo',
  'sawal1',
  'sawal2',
  'sawal3',
  'tahajji',
  'panja',
  'khudKhwani',
  'classWork',
  'remarks',
];

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};
const ensureStudent = async (studentId) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new AppError('طالب علم نہیں ملا۔', 404);
};

const normalizePayload = (payload) => {
  const data = { ...payload };

  nullableFields.forEach((field) => {
    if (data[field] === undefined || data[field] === '') {
      data[field] = null;
    }
  });

  return data;
};

export const weeklyHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    const data = normalizePayload(payload);
    return prisma.hifzWeeklyEntry.upsert({
      where: { studentId_weekStartDate_weekEndDate: { studentId: payload.studentId, weekStartDate, weekEndDate } },
      create: { ...data, weekStartDate, weekEndDate },
      update: { ...data, weekStartDate, weekEndDate },
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
    if (!entry) throw new AppError('ہفتہ وار جائزے کی انٹری نہیں ملی۔', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.hifzWeeklyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('ہفتہ وار جائزے کی انٹری نہیں ملی۔', 404);
    await ensureStudent(payload.studentId);
    const weekStartDate = normalizeDate(payload.weekStartDate);
    const weekEndDate = normalizeDate(payload.weekEndDate);
    const duplicate = await prisma.hifzWeeklyEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, weekStartDate, weekEndDate },
    });
    if (duplicate) throw new AppError('اس طالب علم کا اس ہفتے کا جائزہ پہلے سے موجود ہے۔', 409);
    return prisma.hifzWeeklyEntry.update({
      where: { id },
      data: { ...normalizePayload(payload), weekStartDate, weekEndDate },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.hifzWeeklyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('ہفتہ وار جائزے کی انٹری نہیں ملی۔', 404);
    return prisma.hifzWeeklyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
