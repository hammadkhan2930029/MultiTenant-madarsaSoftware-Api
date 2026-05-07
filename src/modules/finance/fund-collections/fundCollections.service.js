import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  amount: true,
  paymentDate: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, admissionNumber: true, fullName: true } },
  financeHead: { select: { id: true, name: true, type: true } },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const ensureReferences = async ({ studentId, financeHeadId }) => {
  const [student, head] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.financeHead.findUnique({ where: { id: financeHeadId } }),
  ]);
  if (!student) throw new AppError('Student not found.', 404);
  if (!head) throw new AppError('Finance head not found.', 404);
  if (head.type !== 'income') throw new AppError('Selected finance head must be an income head.', 400);
};

export const fundCollectionsService = {
  async createEntry(payload) {
    await ensureReferences(payload);
    return prisma.fundCollection.create({
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.financeHeadId ? { financeHeadId: query.financeHeadId } : {}),
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
      prisma.fundCollection.findMany({ where, skip, take: limit, orderBy: { paymentDate: 'desc' }, select }),
      prisma.fundCollection.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(id) {
    const entry = await prisma.fundCollection.findUnique({ where: { id }, select });
    if (!entry) throw new AppError('Fund collection entry not found.', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.fundCollection.findUnique({ where: { id } });
    if (!existing) throw new AppError('Fund collection entry not found.', 404);
    await ensureReferences(payload);
    return prisma.fundCollection.update({
      where: { id },
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null, status: payload.status || existing.status },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.fundCollection.findUnique({ where: { id } });
    if (!existing) throw new AppError('Fund collection entry not found.', 404);
    return prisma.fundCollection.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
