import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  tenantId: true,
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

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
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

const getTenantFundCollection = async (tenantId, id) => {
  const entry = await prisma.fundCollection.findFirst({
    where: { id, tenantId },
    select,
  });

  if (!entry) {
    throw new AppError('Fund collection record not found.', 404);
  }

  return entry;
};

export const fundCollectionsService = {
  async createEntry(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);

    return prisma.fundCollection.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        paymentDate: normalizeDate(payload.paymentDate),
        remarks: payload.remarks || null,
      },
      select,
    });
  },

  async getEntries(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
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
              { donationType: { contains: query.search } },
              { donationSubType: { contains: query.search } },
              { purpose: { contains: query.search } },
              { receiptNo: { contains: query.search } },
              { collectionGroupId: { contains: query.search } },
              { details: { contains: query.search } },
              { remarks: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            paymentDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeEndDate(query.toDate) } : {}),
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

  async getEntryById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getTenantFundCollection(resolvedTenantId, id);
  },

  async updateEntry(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await getTenantFundCollection(resolvedTenantId, id);

    return prisma.fundCollection.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        ...payload,
        paymentDate: normalizeDate(payload.paymentDate),
        remarks: payload.remarks || null,
        status: payload.status || existing.status,
      },
      select,
    });
  },

  async deactivateEntry(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantFundCollection(resolvedTenantId, id);

    return prisma.fundCollection.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
  },
};
