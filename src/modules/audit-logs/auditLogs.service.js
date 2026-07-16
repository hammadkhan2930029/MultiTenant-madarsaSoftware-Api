import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/index.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

let auditContextColumnsPromise = null;

const hasAuditContextColumns = async () => {
  if (!auditContextColumnsPromise) {
    auditContextColumnsPromise = prisma.$queryRaw`
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'audit_logs'
        AND COLUMN_NAME IN ('branch_id', 'role_id')
    `.then((rows) => {
      const columns = new Set(rows.map((row) => row.columnName || row.COLUMN_NAME));
      return columns.has('branch_id') && columns.has('role_id');
    }).catch(() => false);
  }

  return auditContextColumnsPromise;
};

const parseJson = (value) => {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const mapAuditLog = (row) => ({
  id: Number(row.id),
  tenantId: normalizeId(row.tenant_id),
  branchId: normalizeId(row.branch_id),
  userId: normalizeId(row.actor_user_id),
  roleId: normalizeId(row.role_id),
  action: row.action,
  module: row.module,
  recordType: row.target_type,
  recordId: normalizeId(row.target_id),
  previousValues: parseJson(row.old_value),
  newValues: parseJson(row.new_value),
  ipAddress: row.ip_address || null,
  userAgent: row.user_agent || null,
  timestamp: row.created_at,
  actor: row.actor_id
    ? {
        id: Number(row.actor_id),
        name: row.actor_name,
        username: row.actor_username,
        email: row.actor_email,
      }
    : null,
  role: row.role_id
    ? {
        id: Number(row.role_id),
        name: row.role_name || null,
      }
    : null,
  branch: row.branch_id
    ? {
        id: Number(row.branch_id),
        name: row.branch_name || null,
        code: row.branch_code || null,
      }
    : null,
});

const buildScope = (auth = {}, query = {}) => {
  if (auth.isSuperAdmin) {
    return {
      tenantId: normalizeId(query.tenantId),
      branchId: normalizeId(query.branchId),
    };
  }

  const tenantId = normalizeId(auth.tenantId);
  if (!tenantId) throw new AppError('Tenant context is required.', 403);

  const authBranchId = normalizeId(auth.branchId);
  const requestedBranchId = normalizeId(query.branchId);

  if (authBranchId) {
    if (requestedBranchId && requestedBranchId !== authBranchId) {
      throw new AppError('You do not have access to this branch.', 403);
    }

    return {
      tenantId,
      branchId: authBranchId,
    };
  }

  return {
    tenantId,
    branchId: requestedBranchId,
  };
};

export const auditLogsService = {
  async getAuditLogs(auth = {}, query = {}) {
    const scope = buildScope(auth, query);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const userId = normalizeId(query.userId);
    const roleId = normalizeId(query.roleId);
    const moduleName = query.module || null;
    const action = query.action || null;
    const search = query.search || null;
    const hasContextColumns = await hasAuditContextColumns();

    if (!hasContextColumns && (scope.branchId || roleId)) {
      return {
        items: [],
        meta: buildPaginationMeta({ totalItems: 0, page, limit }),
      };
    }
    const conditions = [];

    if (scope.tenantId) conditions.push(Prisma.sql`al.tenant_id = ${scope.tenantId}`);
    if (hasContextColumns && scope.branchId) conditions.push(Prisma.sql`al.branch_id = ${scope.branchId}`);
    if (userId) conditions.push(Prisma.sql`al.actor_user_id = ${userId}`);
    if (hasContextColumns && roleId) conditions.push(Prisma.sql`al.role_id = ${roleId}`);
    if (moduleName) conditions.push(Prisma.sql`al.module = ${moduleName}`);
    if (action) conditions.push(Prisma.sql`al.action = ${action}`);
    if (search) {
      conditions.push(Prisma.sql`(
        al.action LIKE CONCAT('%', ${search}, '%')
        OR al.module LIKE CONCAT('%', ${search}, '%')
        OR al.target_type LIKE CONCAT('%', ${search}, '%')
        OR a.name LIKE CONCAT('%', ${search}, '%')
        OR a.username LIKE CONCAT('%', ${search}, '%')
        ${hasContextColumns ? Prisma.sql`OR b.name LIKE CONCAT('%', ${search}, '%') OR b.code LIKE CONCAT('%', ${search}, '%')` : Prisma.empty}
      )`);
    }

    const fromSql = hasContextColumns
      ? Prisma.sql`
          FROM audit_logs al
          LEFT JOIN admins a ON a.id = al.actor_user_id
          LEFT JOIN roles r ON r.id = al.role_id
          LEFT JOIN branches b ON b.id = al.branch_id
        `
      : Prisma.sql`
          FROM audit_logs al
          LEFT JOIN admins a ON a.id = al.actor_user_id
        `;
    const whereSql = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;

    const [items, countRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          al.id,
          al.tenant_id,
          al.actor_user_id,
          ${hasContextColumns ? Prisma.sql`al.branch_id` : Prisma.sql`NULL`} AS branch_id,
          ${hasContextColumns ? Prisma.sql`al.role_id` : Prisma.sql`NULL`} AS role_id,
          al.action,
          al.module,
          al.target_type,
          al.target_id,
          JSON_EXTRACT(al.old_value, '$') AS old_value,
          JSON_EXTRACT(al.new_value, '$') AS new_value,
          al.ip_address,
          al.user_agent,
          al.created_at,
          a.id AS actor_id,
          a.name AS actor_name,
          a.username AS actor_username,
          a.email AS actor_email,
          ${hasContextColumns ? Prisma.sql`r.role_name` : Prisma.sql`NULL`} AS role_name,
          ${hasContextColumns ? Prisma.sql`b.name` : Prisma.sql`NULL`} AS branch_name,
          ${hasContextColumns ? Prisma.sql`b.code` : Prisma.sql`NULL`} AS branch_code
        ${fromSql}
        ${whereSql}
        ORDER BY al.created_at DESC, al.id DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
      prisma.$queryRaw`SELECT COUNT(*) AS total ${fromSql} ${whereSql}`,
    ]);

    const totalItems = Number(countRows?.[0]?.total || 0);

    return {
      items: items.map(mapAuditLog),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },
};
