import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  amount: true,
  salaryMonth: true,
  salaryYear: true,
  paymentDate: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, fullName: true, phone: true, subject: true } },
  financeHead: { select: { id: true, name: true, type: true } },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const ensureReferences = async ({ teacherId, financeHeadId }) => {
  const [teacher, head] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.financeHead.findUnique({ where: { id: financeHeadId } }),
  ]);
  if (!teacher) throw new AppError('Teacher not found.', 404);
  if (!head) throw new AppError('Finance head not found.', 404);
  if (head.type !== 'expense') throw new AppError('Selected finance head must be an expense head.', 400);
};

export const salariesService = {
  async createEntry(payload) {
    await ensureReferences(payload);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: { teacherId: payload.teacherId, salaryMonth: payload.salaryMonth, salaryYear: payload.salaryYear },
    });
    if (duplicate) throw new AppError('Salary entry for this teacher and month already exists.', 409);
    return prisma.salaryEntry.create({
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.salaryMonth ? { salaryMonth: query.salaryMonth } : {}),
      ...(query.salaryYear ? { salaryYear: query.salaryYear } : {}),
      ...(query.fromDate || query.toDate
        ? {
            paymentDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.salaryEntry.findMany({ where, skip, take: limit, orderBy: [{ salaryYear: 'desc' }, { salaryMonth: 'desc' }], select }),
      prisma.salaryEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(id) {
    const entry = await prisma.salaryEntry.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Salary entry not found.', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.salaryEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    await ensureReferences(payload);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: { id: { not: id }, teacherId: payload.teacherId, salaryMonth: payload.salaryMonth, salaryYear: payload.salaryYear },
    });
    if (duplicate) throw new AppError('Another salary entry for this teacher and month already exists.', 409);
    return prisma.salaryEntry.update({
      where: { id },
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null, status: payload.status || existing.status },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.salaryEntry.findUnique({ where: { id } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    return prisma.salaryEntry.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
