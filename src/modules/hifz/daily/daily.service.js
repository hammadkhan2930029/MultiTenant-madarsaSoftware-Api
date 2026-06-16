import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  studentId: true,
  date: true,
  sabq: true,
  sabqListener: true,
  sabqRuku: true,
  sabqAyatFrom: true,
  sabqAyatTo: true,
  sabqTeacherName: true,
  sabqMistake: true,
  sabqAtkann: true,
  sabaqi: true,
  sabaqiRuku: true,
  sabaqiAyatFrom: true,
  sabaqiAyatTo: true,
  sabaqiMistake: true,
  sabaqiAtkann: true,
  manzil: true,
  manzilBeforeDetail: true,
  manzilBeforePara: true,
  manzilBeforeRuku: true,
  manzilBeforeAyatFrom: true,
  manzilBeforeAyatTo: true,
  manzilBeforeMistake: true,
  manzilBeforeAtkann: true,
  manzilAfterDetail: true,
  manzilAfterPara: true,
  manzilAfterRuku: true,
  manzilAfterAyatFrom: true,
  manzilAfterAyatTo: true,
  manzilAfterMistake: true,
  manzilAfterAtkann: true,
  lessonDetail: true,
  count: true,
  performanceStatus: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
};

const nullableFields = [
  'sabq',
  'sabqListener',
  'sabqRuku',
  'sabqAyatFrom',
  'sabqAyatTo',
  'sabqTeacherName',
  'sabqMistake',
  'sabqAtkann',
  'sabaqi',
  'sabaqiRuku',
  'sabaqiAyatFrom',
  'sabaqiAyatTo',
  'sabaqiMistake',
  'sabaqiAtkann',
  'manzil',
  'manzilBeforeDetail',
  'manzilBeforePara',
  'manzilBeforeRuku',
  'manzilBeforeAyatFrom',
  'manzilBeforeAyatTo',
  'manzilBeforeMistake',
  'manzilBeforeAtkann',
  'manzilAfterDetail',
  'manzilAfterPara',
  'manzilAfterRuku',
  'manzilAfterAyatFrom',
  'manzilAfterAyatTo',
  'manzilAfterMistake',
  'manzilAfterAtkann',
  'lessonDetail',
  'count',
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

export const dailyHifzService = {
  async createEntry(payload) {
    await ensureStudent(payload.studentId);
    const date = normalizeDate(payload.date);
    const data = normalizePayload(payload);
    return prisma.hifzDailyEntry.upsert({
      where: { studentId_date: { studentId: payload.studentId, date } },
      create: { ...data, date },
      update: { ...data, date },
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
    if (!entry) throw new AppError('یومیہ جائزے کی انٹری نہیں ملی۔', 404);
    return entry;
  },

  async updateEntry(id, payload) {
    const existing = await prisma.hifzDailyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('یومیہ جائزے کی انٹری نہیں ملی۔', 404);
    await ensureStudent(payload.studentId);
    const duplicate = await prisma.hifzDailyEntry.findFirst({
      where: { id: { not: id }, studentId: payload.studentId, date: normalizeDate(payload.date) },
    });
    if (duplicate) throw new AppError('اس طالب علم کا اس تاریخ کا یومیہ جائزہ پہلے سے موجود ہے۔', 409);
    return prisma.hifzDailyEntry.update({
      where: { id },
      data: { ...normalizePayload(payload), date: normalizeDate(payload.date) },
      select,
    });
  },

  async deactivateEntry(id) {
    const existing = await prisma.hifzDailyEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('یومیہ جائزے کی انٹری نہیں ملی۔', 404);
    return prisma.hifzDailyEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
