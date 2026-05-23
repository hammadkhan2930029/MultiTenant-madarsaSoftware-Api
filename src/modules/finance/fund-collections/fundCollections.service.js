import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  collectionGroupId: true,
  donorName: true,
  careOf: true,
  phone: true,
  paymentMode: true,
  donationType: true,
  donationSubType: true,
  purpose: true,
  amount: true,
  receiptNo: true,
  details: true,
  paymentDate: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const fundCollectionsService = {
  async createEntry(payload) {
    return prisma.fundCollection.create({
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null },
      select,
    });
  },
  async getEntries(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.donationType ? { donationType: query.donationType } : {}),
      ...(query.donationSubType ? { donationSubType: query.donationSubType } : {}),
      ...(query.phone ? { phone: query.phone } : {}),
      ...(query.collectionGroupId ? { collectionGroupId: query.collectionGroupId } : {}),
      ...(query.search
        ? {
            OR: [
              { donorName: { contains: query.search } },
              { careOf: { contains: query.search } },
              { phone: { contains: query.search } },
              { purpose: { contains: query.search } },
              { receiptNo: { contains: query.search } },
              { collectionGroupId: { contains: query.search } },
            ],
          }
        : {}),
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
    if (!entry) throw new AppError('فنڈ وصولی کا ریکارڈ نہیں ملا۔', 404);
    return entry;
  },
  async updateEntry(id, payload) {
    const existing = await prisma.fundCollection.findUnique({ where: { id } });
    if (!existing) throw new AppError('فنڈ وصولی کا ریکارڈ نہیں ملا۔', 404);
    return prisma.fundCollection.update({
      where: { id },
      data: { ...payload, paymentDate: normalizeDate(payload.paymentDate), remarks: payload.remarks || null, status: payload.status || existing.status },
      select,
    });
  },
  async deactivateEntry(id) {
    const existing = await prisma.fundCollection.findUnique({ where: { id } });
    if (!existing) throw new AppError('فنڈ وصولی کا ریکارڈ نہیں ملا۔', 404);
    return prisma.fundCollection.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
