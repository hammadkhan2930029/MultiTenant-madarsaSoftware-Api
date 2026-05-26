import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  financeHeadId: true,
  type: true,
  amount: true,
  transactionDate: true,
  paymentMode: true,
  paymentStatus: true,
  slipNo: true,
  details: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  financeHead: { select: { id: true, name: true, type: true } },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEndDate = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const ensureHead = async ({ financeHeadId, type }) => {
  const head = await prisma.financeHead.findUnique({ where: { id: financeHeadId } });
  if (!head) throw new AppError('مالیاتی مد نہیں ملی۔', 404);
  if (head.status !== 'active') throw new AppError('منتخب مالیاتی مد فعال نہیں ہے۔', 400);
  if (head.type !== type) throw new AppError('منتخب مالیاتی مد آمدن/خرچ کی قسم سے مطابقت نہیں رکھتی۔', 400);
};

export const transactionsService = {
  async createEntry(payload) {
    await ensureHead(payload);
    return prisma.financeTransaction.create({
      data: {
        ...payload,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
      },
      select,
    });
  },

  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.financeHeadId ? { financeHeadId: query.financeHeadId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { slipNo: { contains: query.search } },
              { details: { contains: query.search } },
              { financeHead: { name: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            transactionDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeEndDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.financeTransaction.findMany({ where, skip, take: limit, orderBy: { transactionDate: 'desc' }, select }),
      prisma.financeTransaction.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async updateEntry(id, payload) {
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) throw new AppError('مالیاتی ریکارڈ نہیں ملا۔', 404);
    await ensureHead(payload);
    return prisma.financeTransaction.update({
      where: { id },
      data: {
        ...payload,
        transactionDate: normalizeDate(payload.transactionDate),
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        slipNo: payload.slipNo || null,
        details: payload.details || null,
        status: payload.status || existing.status,
      },
      select,
    });
  },

  async deactivateEntry(id) {
    const existing = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existing) throw new AppError('مالیاتی ریکارڈ نہیں ملا۔', 404);
    return prisma.financeTransaction.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
