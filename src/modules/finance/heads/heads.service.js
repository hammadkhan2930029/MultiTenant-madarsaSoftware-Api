import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const select = {
  id: true,
  tenantId: true,
  name: true,
  type: true,
  description: true,
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

const getTenantHead = async (tenantId, id) => {
  const head = await prisma.financeHead.findFirst({
    where: { id, tenantId },
    select,
  });

  if (!head) {
    throw new AppError('Finance head not found.', 404);
  }

  return head;
};

export const headsService = {
  async createHead(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await prisma.financeHead.findFirst({
      where: { tenantId: resolvedTenantId, name: payload.name },
    });

    if (existing) {
      throw new AppError('Finance head with the same name already exists.', 409);
    }

    return prisma.financeHead.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        description: payload.description || null,
      },
      select,
    });
  },

  async getHeads(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
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

  async getHeadById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getTenantHead(resolvedTenantId, id);
  },

  async updateHead(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantHead(resolvedTenantId, id);

    if (payload.name) {
      const duplicate = await prisma.financeHead.findFirst({
        where: { tenantId: resolvedTenantId, id: { not: id }, name: payload.name },
      });

      if (duplicate) {
        throw new AppError('Another finance head with the same name already exists.', 409);
      }
    }

    return prisma.financeHead.update({
      where: { id, tenantId: resolvedTenantId },
      data: { ...payload, description: payload.description || null },
      select,
    });
  },

  async deactivateHead(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantHead(resolvedTenantId, id);

    return prisma.financeHead.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
  },
};
