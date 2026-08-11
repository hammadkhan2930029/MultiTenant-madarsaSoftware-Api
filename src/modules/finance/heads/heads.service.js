import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { branchScopeService } from '../../security/index.js';

const select = {
  id: true,
  tenantId: true,
  branchId: true,
  expenseCategoryId: true,
  name: true,
  type: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  expenseCategory: { select: { id: true, name: true, status: true } },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const resolveFinanceBranchId = (tenantId, queryOrPayload = {}, branchScope = null) => (
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope)
);

const getTenantHead = async (tenantId, id, branchId) => {
  const head = await prisma.financeHead.findFirst({
    where: { id, tenantId, branchId },
    select,
  });

  if (!head) {
    throw new AppError('Finance head not found.', 404);
  }

  return head;
};

const resolveExpenseCategoryId = async (tenantId, branchId, type, expenseCategoryId) => {
  if (type !== 'expense' || !expenseCategoryId) return null;

  const category = await prisma.financeExpenseCategory.findFirst({
    where: { id: expenseCategoryId, tenantId, branchId, status: 'active' },
    select: { id: true },
  });
  if (!category) throw new AppError('Active expense category not found for this branch.', 404);
  return category.id;
};

export const headsService = {
  async createHead(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, payload, branchScope);
    const expenseCategoryId = await resolveExpenseCategoryId(resolvedTenantId, branchId, payload.type, payload.expenseCategoryId);
    const existing = await prisma.financeHead.findFirst({
      where: { tenantId: resolvedTenantId, branchId, name: payload.name },
    });

    if (existing) {
      throw new AppError('Finance head with the same name already exists.', 409);
    }

    return prisma.financeHead.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        branchId,
        expenseCategoryId,
        description: payload.description || null,
      },
      select,
    });
  },

  async getHeads(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      branchId,
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

  async getHeadById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, {}, branchScope);
    return getTenantHead(resolvedTenantId, id, branchId);
  },

  async updateHead(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, payload, branchScope);
    const currentHead = await getTenantHead(resolvedTenantId, id, branchId);
    const nextType = payload.type || currentHead.type;
    const expenseCategoryId = await resolveExpenseCategoryId(resolvedTenantId, branchId, nextType, payload.expenseCategoryId);

    if (payload.name) {
      const duplicate = await prisma.financeHead.findFirst({
        where: { tenantId: resolvedTenantId, branchId, id: { not: id }, name: payload.name },
      });

      if (duplicate) {
        throw new AppError('Another finance head with the same name already exists.', 409);
      }
    }

    return prisma.financeHead.update({
      where: { id },
      data: { ...payload, expenseCategoryId, description: payload.description || null },
      select,
    });
  },

  async deactivateHead(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, {}, branchScope);
    await getTenantHead(resolvedTenantId, id, branchId);

    return prisma.financeHead.update({ where: { id }, data: { status: 'inactive' }, select });
  },
};
