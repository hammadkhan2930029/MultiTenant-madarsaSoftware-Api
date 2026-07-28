import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { branchScopeService } from '../../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const mapCategory = (row) => ({
  id: Number(row.id),
  tenantId: Number(row.tenant_id),
  branchId: row.branch_id === null || row.branch_id === undefined ? null : Number(row.branch_id),
  name: row.name,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const resolveFinanceBranchId = (tenantId, queryOrPayload = {}, branchScope = null) => (
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope)
);

const getCategoryById = async (tenantId, id, branchId) => {
  const rows = await prisma.$queryRaw`
    SELECT id, tenant_id, branch_id, name, status, createdAt, updatedAt
    FROM finance_expense_categories
    WHERE id = ${id} AND tenant_id = ${tenantId} AND branch_id = ${branchId}
    LIMIT 1
  `;

  if (!rows.length) {
    throw new AppError('خرچ کی قسم نہیں ملی۔', 404);
  }

  return mapCategory(rows[0]);
};

export const expenseCategoriesService = {
  async createCategory(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, payload, branchScope);
    const name = payload.name.trim();
    const status = payload.status || 'active';

    const duplicates = await prisma.$queryRaw`
      SELECT id
      FROM finance_expense_categories
      WHERE tenant_id = ${resolvedTenantId} AND branch_id = ${branchId} AND name = ${name}
      LIMIT 1
    `;

    if (duplicates.length) {
      throw new AppError('یہ خرچ کی قسم پہلے سے موجود ہے۔', 409);
    }

    await prisma.$executeRaw`
      INSERT INTO finance_expense_categories (tenant_id, branch_id, name, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${branchId}, ${name}, ${status}, ${new Date()}, ${new Date()})
    `;

    const rows = await prisma.$queryRaw`
      SELECT id, tenant_id, branch_id, name, status, createdAt, updatedAt
      FROM finance_expense_categories
      WHERE tenant_id = ${resolvedTenantId} AND branch_id = ${branchId} AND name = ${name}
      LIMIT 1
    `;

    return mapCategory(rows[0]);
  },

  async getCategories(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search?.trim() || '';
    const searchLike = `%${search}%`;
    const status = query.status || '';

    const items = await prisma.$queryRaw`
      SELECT id, tenant_id, branch_id, name, status, createdAt, updatedAt
      FROM finance_expense_categories
      WHERE tenant_id = ${resolvedTenantId}
        AND branch_id = ${branchId}
        AND (${search} = '' OR name LIKE ${searchLike})
        AND (${status} = '' OR status = ${status})
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM finance_expense_categories
      WHERE tenant_id = ${resolvedTenantId}
        AND branch_id = ${branchId}
        AND (${search} = '' OR name LIKE ${searchLike})
        AND (${status} = '' OR status = ${status})
    `;

    const totalItems = Number(totalRows[0]?.total || 0);
    return { items: items.map(mapCategory), meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getCategoryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, {}, branchScope);
    return getCategoryById(resolvedTenantId, id, branchId);
  },

  async updateCategory(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, payload, branchScope);
    await getCategoryById(resolvedTenantId, id, branchId);

    const name = payload.name.trim();
    const status = payload.status || 'active';
    const duplicates = await prisma.$queryRaw`
      SELECT id
      FROM finance_expense_categories
      WHERE tenant_id = ${resolvedTenantId} AND branch_id = ${branchId} AND id <> ${id} AND name = ${name}
      LIMIT 1
    `;

    if (duplicates.length) {
      throw new AppError('یہ خرچ کی قسم پہلے سے موجود ہے۔', 409);
    }

    await prisma.$executeRaw`
      UPDATE finance_expense_categories
      SET name = ${name}, status = ${status}, updatedAt = ${new Date()}
      WHERE id = ${id} AND tenant_id = ${resolvedTenantId} AND branch_id = ${branchId}
    `;

    return getCategoryById(resolvedTenantId, id, branchId);
  },

  async deactivateCategory(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveFinanceBranchId(resolvedTenantId, {}, branchScope);
    await getCategoryById(resolvedTenantId, id, branchId);

    await prisma.$executeRaw`
      UPDATE finance_expense_categories
      SET status = 'inactive', updatedAt = ${new Date()}
      WHERE id = ${id} AND tenant_id = ${resolvedTenantId} AND branch_id = ${branchId}
    `;

    return getCategoryById(resolvedTenantId, id, branchId);
  },
};
