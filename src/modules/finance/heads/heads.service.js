import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  name: true,
  type: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const headsService = {
  async createHead(payload) {
    const existing = await prisma.financeHead.findUnique({ where: { name: payload.name } });
    if (existing) throw new AppError('اسی نام سے مالیاتی قسم پہلے سے موجود ہے۔', 409);
    return prisma.financeHead.create({ data: { ...payload, description: payload.description || null }, select });
  },
  async getHeads(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.search ? { name: { contains: query.search } } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, totalItems] = await Promise.all([
      prisma.financeHead.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select }),
      prisma.financeHead.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getHeadById(id) {
    const head = await prisma.financeHead.findUnique({ where: { id }, select });
    if (!head) throw new AppError('مالیاتی قسم نہیں ملی۔', 404);
    return head;
  },
  async updateHead(id, payload) {
    const existing = await prisma.financeHead.findUnique({ where: { id } });
    if (!existing) throw new AppError('مالیاتی قسم نہیں ملی۔', 404);
    const duplicate = await prisma.financeHead.findFirst({ where: { id: { not: id }, name: payload.name } });
    if (duplicate) throw new AppError('اسی نام سے کوئی دوسری مالیاتی قسم پہلے سے موجود ہے۔', 409);
    return prisma.financeHead.update({ where: { id }, data: { ...payload, description: payload.description || null }, select });
  },
  async deactivateHead(id) {
    const existing = await prisma.financeHead.findUnique({ where: { id } });
    if (!existing) throw new AppError('مالیاتی قسم نہیں ملی۔', 404);
    return prisma.financeHead.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
