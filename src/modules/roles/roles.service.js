import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { auditService } from '../security/index.js';

const SYSTEM_SUPER_ADMIN_ROLE = 'super_admin';
const BRANCH_RESTRICTED_PERMISSION_MODULES = new Set(['tenant_management', 'branches']);
const BRANCH_RESTRICTED_PERMISSION_PREFIXES = ['tenant_management.', 'branches.'];
const BRANCH_PROTECTED_ROLE_NAMES = new Set(['super_admin', 'admin']);

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const mapRole = (row) => ({
  id: Number(row.id),
  tenantId: toNumber(row.tenant_id),
  branchId: toNumber(row.branch_id),
  roleScopeKey: row.role_scope_key === undefined ? undefined : Number(row.role_scope_key),
  scope: row.tenant_id === null || row.tenant_id === undefined
    ? 'system'
    : row.branch_id === null || row.branch_id === undefined
      ? 'tenant'
      : 'branch',
  name: row.role_name,
  roleName: row.role_name,
  description: row.description,
  status: row.status || 'active',
  isSystemRole: Boolean(row.is_system_role),
  createdBy: toNumber(row.created_by),
  updatedBy: toNumber(row.updated_by),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  assignedUsers: row.assigned_users === undefined ? undefined : Number(row.assigned_users),
});

const mapPermission = (row) => ({
  id: Number(row.id),
  permissionKey: row.permission_key,
  permissionName: row.permission_name,
  displayLabel: row.display_label,
  description: row.description,
  pagePath: row.page_path,
  moduleName: row.module_name,
  action: row.action,
  sortOrder: row.sort_order === undefined ? undefined : Number(row.sort_order),
  createdAt: row.created_at,
});

const normalizeRoleName = (roleName) => String(roleName || '').trim();
const normalizeOptionalTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const normalizeOptionalBranchId = (branchId) => (
  branchId === null || branchId === undefined || branchId === '' ? null : Number(branchId)
);

const getRoleScopeKey = (branchId) => normalizeOptionalBranchId(branchId) || 0;

const isBranchScopedRequester = (requester = {}) => Boolean(
  normalizeOptionalBranchId(requester?.branchId) && !requester?.isTenantAdmin && !requester?.isSuperAdmin,
);

const logDeniedRoleAudit = (requester = {}, entry = {}) => auditService.recordAuditLog(prisma, {
  tenantId: requester?.tenantId || null,
  actorUserId: requester?.admin?.id || null,
  branchId: requester?.audit?.branchId || requester?.branchId || null,
  roleId: requester?.audit?.roleId || requester?.admin?.roleId || requester?.admin?.role_id || null,
  module: 'roles',
  targetType: 'role',
  action: 'role.authorization.denied',
  ipAddress: requester?.audit?.ipAddress || null,
  userAgent: requester?.audit?.userAgent || null,
  ...entry,
});

const denyRoleEscalation = async (requester, reason, details = {}) => {
  await logDeniedRoleAudit(requester, {
    oldValue: null,
    newValue: {
      reason,
      ...details,
    },
  });
  throw new AppError('Branch admin cannot perform this action outside own branch scope.', 403);
};

const assertNoBranchScopeInjection = async (payload = {}, requester = {}, targetRoleId = null) => {
  if (!isBranchScopedRequester(requester)) return;

  const requesterTenantId = normalizeOptionalTenantId(requester?.tenantId);
  const requesterBranchId = normalizeOptionalBranchId(requester?.branchId);

  if (
    Object.prototype.hasOwnProperty.call(payload, 'tenantId') &&
    normalizeOptionalTenantId(payload.tenantId) !== requesterTenantId
  ) {
    await denyRoleEscalation(requester, 'tenantId injection', {
      targetId: targetRoleId,
      requestedTenantId: payload.tenantId,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(payload, 'branchId') &&
    normalizeOptionalBranchId(payload.branchId) !== requesterBranchId
  ) {
    await denyRoleEscalation(requester, 'branchId injection', {
      targetId: targetRoleId,
      requestedBranchId: payload.branchId,
    });
  }
};

const resolveRoleTenantId = (payload = {}, requester = {}) => {
  if (requester?.isSuperAdmin) {
    return normalizeOptionalTenantId(payload.tenantId);
  }

  const tenantId = normalizeOptionalTenantId(requester?.tenantId);
  if (!tenantId) {
    throw new AppError('Tenant context is required for tenant roles.', 403);
  }

  return tenantId;
};

const ensureBranchBelongsToTenant = async (client, { tenantId, branchId }) => {
  const resolvedTenantId = normalizeOptionalTenantId(tenantId);
  const resolvedBranchId = normalizeOptionalBranchId(branchId);

  if (!resolvedBranchId) return null;

  if (!resolvedTenantId) {
    throw new AppError('Tenant context is required for branch roles.', 403);
  }

  const branch = await client.branch.findFirst({
    where: {
      id: resolvedBranchId,
      tenantId: resolvedTenantId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!branch) {
    throw new AppError('Branch not found.', 404);
  }

  if (branch.status !== 'active') {
    throw new AppError('Selected branch is inactive.', 400);
  }

  return Number(branch.id);
};

const resolveRoleBranchId = async (client, payload = {}, requester = {}, roleTenantId = null) => {
  const requesterBranchId = normalizeOptionalBranchId(requester?.branchId);

  if (requesterBranchId && !requester?.isTenantAdmin && !requester?.isSuperAdmin) {
    return requesterBranchId;
  }

  const requestedBranchId = normalizeOptionalBranchId(payload.branchId);
  if (!requestedBranchId) return null;

  return ensureBranchBelongsToTenant(client, {
    tenantId: roleTenantId,
    branchId: requestedBranchId,
  });
};

const assertCanAccessRole = (role, requester = {}) => {
  if (requester?.isSuperAdmin) return;

  const roleTenantId = normalizeOptionalTenantId(role?.tenant_id);
  const requestTenantId = normalizeOptionalTenantId(requester?.tenantId);
  const roleBranchId = normalizeOptionalBranchId(role?.branch_id);
  const roleScopeKey = Number(role?.role_scope_key || 0);
  const requesterBranchId = normalizeOptionalBranchId(requester?.branchId);

  if (roleTenantId !== null && roleTenantId !== requestTenantId) {
    throw new AppError('Role not found.', 404);
  }

  if (
    isBranchScopedRequester(requester) &&
    (roleTenantId !== requestTenantId || roleBranchId !== requesterBranchId || roleScopeKey !== requesterBranchId)
  ) {
    throw new AppError('Role not found.', 404);
  }
};

const buildRoleScopeWhere = (query = {}, requester = {}) => {
  if (!requester?.isSuperAdmin) {
    const tenantId = normalizeOptionalTenantId(requester?.tenantId);
    const requesterBranchId = normalizeOptionalBranchId(requester?.branchId);
    const queryBranchId = normalizeOptionalBranchId(query.branchId);

    if (requesterBranchId) {
      return {
        sql: 'r.tenant_id = ? AND r.branch_id = ? AND r.role_scope_key = ?',
        values: [tenantId, requesterBranchId, requesterBranchId],
      };
    }

    if (queryBranchId) {
      return {
        sql: 'r.tenant_id = ? AND r.branch_id = ? AND r.role_scope_key = ?',
        values: [tenantId, queryBranchId, queryBranchId],
      };
    }

    return {
      sql: `(
        (r.tenant_id = ? AND r.branch_id IS NULL)
        OR (
          r.tenant_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM roles tenant_role
            WHERE tenant_role.tenant_id = ?
              AND tenant_role.branch_id IS NULL
              AND tenant_role.role_name = r.role_name
          )
        )
      )`,
      values: [tenantId, tenantId],
    };
  }

  if (query.scope === 'global') {
    return { sql: 'r.tenant_id IS NULL', values: [] };
  }

  const queryTenantId = normalizeOptionalTenantId(query.tenantId);
  const queryBranchId = normalizeOptionalBranchId(query.branchId);
  if (queryBranchId) {
    return { sql: 'r.tenant_id = ? AND r.branch_id = ? AND r.role_scope_key = ?', values: [queryTenantId, queryBranchId, queryBranchId] };
  }

  if (query.scope === 'tenant' || queryTenantId) {
    return { sql: 'r.tenant_id = ? AND r.branch_id IS NULL', values: [queryTenantId] };
  }

  return { sql: '1 = 1', values: [] };
};

const getRoleRowById = async (client, id) => {
  const rows = await client.$queryRaw`
    SELECT
      r.id,
      r.tenant_id,
      r.branch_id,
      r.role_scope_key,
      r.role_name,
      r.description,
      r.status,
      r.is_system_role,
      r.created_by,
      r.updated_by,
      r.created_at,
      r.updated_at,
      COUNT(a.id) AS assigned_users
    FROM roles r
    LEFT JOIN admins a ON a.role_id = r.id
    WHERE r.id = ${id}
    GROUP BY r.id, r.tenant_id, r.branch_id, r.role_scope_key, r.role_name, r.description, r.status, r.is_system_role, r.created_by, r.updated_by, r.created_at, r.updated_at
    LIMIT 1
  `;

  return rows[0] || null;
};

const getRoleByName = async (client, roleName, tenantId, branchId = null, excludeId = null) => {
  const roleBranchId = normalizeOptionalBranchId(branchId);
  const roleScopeKey = getRoleScopeKey(roleBranchId);
  const rows = excludeId
    ? await client.$queryRaw`
        SELECT id, tenant_id, branch_id, role_scope_key, role_name
        FROM roles
        WHERE role_name = ${roleName}
          AND tenant_id <=> ${tenantId}
          AND role_scope_key = ${roleScopeKey}
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await client.$queryRaw`
        SELECT id, tenant_id, branch_id, role_scope_key, role_name
        FROM roles
        WHERE role_name = ${roleName}
          AND tenant_id <=> ${tenantId}
          AND role_scope_key = ${roleScopeKey}
        LIMIT 1
      `;

  return rows[0] || null;
};

const getTenantIds = async (client) => {
  const rows = await client.$queryRaw`
    SELECT id
    FROM tenant
    WHERE status = 'active'
  `;

  return rows.map((row) => Number(row.id)).filter(Boolean);
};

const copyRolePermissions = async (client, { sourceRoleId, targetRoleId, targetTenantId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${targetTenantId}, ${targetRoleId}, permission_id
    FROM role_permissions
    WHERE role_id = ${sourceRoleId}
  `;
};

const ensureTenantCopyOfRole = async (client, { globalRole, tenantId, actorId = null, payload = null }) => {
  const globalRoleName = normalizeRoleName(globalRole.role_name);
  const nextRoleName = normalizeRoleName(payload?.roleName || payload?.name || globalRoleName);
  const existingTenantRole = await getRoleByName(client, globalRoleName, tenantId);

  if (existingTenantRole) {
    await client.$executeRaw`
      UPDATE roles
      SET
        role_name = ${nextRoleName},
        description = ${payload?.description === undefined ? globalRole.description : payload.description || null},
        status = ${payload?.status || globalRole.status || 'active'},
        updated_by = ${actorId},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(existingTenantRole.id)}
    `;

    return Number(existingTenantRole.id);
  }

  await client.$executeRaw`
    INSERT INTO roles (tenant_id, branch_id, role_scope_key, role_name, description, status, is_system_role, created_by, updated_by)
    VALUES (
      ${tenantId},
      ${null},
      ${0},
      ${nextRoleName},
      ${payload?.description === undefined ? globalRole.description : payload.description || null},
      ${payload?.status || globalRole.status || 'active'},
      ${Boolean(globalRole.is_system_role)},
      ${actorId},
      ${actorId}
    )
  `;

  const createdRole = await getRoleByName(client, nextRoleName, tenantId);
  const createdRoleId = Number(createdRole.id);
  await copyRolePermissions(client, {
    sourceRoleId: Number(globalRole.id),
    targetRoleId: createdRoleId,
    targetTenantId: tenantId,
  });

  return createdRoleId;
};

const propagateGlobalRoleToTenants = async (client, { globalRoleId, actorId = null }) => {
  const globalRole = await assertRoleExists(client, globalRoleId);
  const tenantIds = await getTenantIds(client);

  for (const tenantId of tenantIds) {
    const tenantRoleId = await ensureTenantCopyOfRole(client, {
      globalRole,
      tenantId,
      actorId,
    });

    await client.$executeRaw`
      DELETE FROM role_permissions
      WHERE role_id = ${tenantRoleId}
        AND tenant_id = ${tenantId}
    `;
    await copyRolePermissions(client, {
      sourceRoleId: globalRoleId,
      targetRoleId: tenantRoleId,
      targetTenantId: tenantId,
    });
  }
};

const getRolePermissions = async (client, roleId) => {
  const role = await getRoleRowById(client, roleId);
  const roleTenantId = normalizeOptionalTenantId(role?.tenant_id);

  const rows = await client.$queryRaw`
    SELECT
      p.id,
      p.permission_key,
      p.permission_name,
      p.page_path,
      p.module_name,
      p.created_at
    FROM role_permissions rp
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ${roleId}
      AND rp.tenant_id <=> ${roleTenantId}
    ORDER BY p.module_name ASC, p.permission_key ASC
  `;

  return rows.map(mapPermission);
};

const collectPermissionInputs = (payload = {}) => {
  const ids = new Set();
  const keys = new Set();

  for (const id of payload.permissionIds || []) {
    ids.add(Number(id));
  }

  for (const key of payload.permissionKeys || []) {
    keys.add(String(key).trim());
  }

  for (const permission of payload.permissions || []) {
    if (typeof permission === 'number') {
      ids.add(Number(permission));
    } else {
      const numericPermission = Number(permission);
      if (Number.isInteger(numericPermission) && String(permission).trim() === String(numericPermission)) {
        ids.add(numericPermission);
      } else {
        keys.add(String(permission).trim());
      }
    }
  }

  return {
    ids: Array.from(ids).filter((id) => Number.isInteger(id) && id > 0),
    keys: Array.from(keys).filter(Boolean),
  };
};

const assertBranchRoleNameAllowed = (roleName, requester = {}) => {
  if (!isBranchScopedRequester(requester)) return;

  const normalizedRoleName = normalizeRoleName(roleName).toLowerCase();
  if (BRANCH_PROTECTED_ROLE_NAMES.has(normalizedRoleName)) {
    throw new AppError('Branch admin cannot create protected system roles.', 403);
  }
};

const assertBranchRoleCanBeChanged = (role, requester = {}) => {
  if (!isBranchScopedRequester(requester)) return;

  const roleName = normalizeRoleName(role?.role_name).toLowerCase();
  if (Boolean(role?.is_system_role) || BRANCH_PROTECTED_ROLE_NAMES.has(roleName)) {
    throw new AppError('Branch admin cannot change protected system roles.', 403);
  }
};

const assertNotCurrentRequesterRole = (role, requester = {}) => {
  const requesterRoleId = requester?.role?.id || requester?.admin?.roleId || requester?.admin?.role_id || null;
  if (requesterRoleId && Number(role?.id) === Number(requesterRoleId)) {
    throw new AppError('You cannot delete your current role.', 400);
  }
};

const getPermissionsByIds = async (client, permissionIds = []) => {
  const ids = permissionIds.map((id) => Number(id)).filter(Number.isInteger);
  if (!ids.length) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = await client.$queryRawUnsafe(`
    SELECT id, permission_key, module_name
    FROM permissions
    WHERE id IN (${placeholders})
  `, ...ids);

  return rows.map((row) => ({
    id: Number(row.id),
    permissionKey: row.permission_key,
    moduleName: row.module_name,
  }));
};

const isRestrictedForBranchAdmin = (permission = {}) => {
  const key = String(permission.permissionKey || '').trim().toLowerCase();
  const moduleName = String(permission.moduleName || '').trim().toLowerCase().replace(/\s+/g, '_');

  return (
    BRANCH_RESTRICTED_PERMISSION_MODULES.has(moduleName) ||
    BRANCH_RESTRICTED_PERMISSION_PREFIXES.some((prefix) => key.startsWith(prefix)) ||
    key === SYSTEM_SUPER_ADMIN_ROLE
  );
};

const filterPermissionsForRequester = (permissions = [], requester = {}) => {
  if (!isBranchScopedRequester(requester)) return permissions;

  const requesterPermissions = new Set(requester.permissionKeys || []);
  return permissions.filter((permission) => (
    requesterPermissions.has(permission.permissionKey) &&
    !isRestrictedForBranchAdmin(permission)
  ));
};

const assertPermissionBoundary = async (client, permissionIds = [], requester = {}) => {
  if (!isBranchScopedRequester(requester) || !permissionIds.length) return;

  const requesterPermissions = new Set(requester.permissionKeys || []);
  const ids = permissionIds.map((id) => Number(id)).filter(Number.isInteger);
  if (!ids.length) return;
  const placeholders = ids.map(() => '?').join(',');
  const restrictedRows = await client.$queryRawUnsafe(`
    SELECT permission_key
    FROM permissions
    WHERE id IN (${placeholders})
      AND (
        LOWER(REPLACE(module_name, ' ', '_')) IN ('tenant_management', 'branches')
        OR LOWER(permission_key) LIKE 'tenant_management.%'
        OR LOWER(permission_key) LIKE 'branches.%'
        OR LOWER(permission_key) = ?
      )
    LIMIT 1
  `, ...ids, SYSTEM_SUPER_ADMIN_ROLE);

  if (restrictedRows[0]) {
    await denyRoleEscalation(requester, 'restricted permission requested', {
      permissionKey: restrictedRows[0].permission_key,
    });
  }

  const permissions = await getPermissionsByIds(client, permissionIds);

  for (const permission of permissions) {
    if (!requesterPermissions.has(permission.permissionKey) || isRestrictedForBranchAdmin(permission)) {
      await denyRoleEscalation(requester, 'permission boundary exceeded', {
        permissionKey: permission.permissionKey,
      });
    }
  }
};

const resolvePermissionIds = async (client, payload = {}) => {
  const { ids, keys } = collectPermissionInputs(payload);
  const resolvedIds = new Set();
  const missingPermissions = [];

  for (const id of ids) {
    const rows = await client.$queryRaw`
      SELECT id
      FROM permissions
      WHERE id = ${id}
      LIMIT 1
    `;

    if (rows[0]) {
      resolvedIds.add(Number(rows[0].id));
    } else {
      missingPermissions.push(`id:${id}`);
    }
  }

  for (const key of keys) {
    const rows = await client.$queryRaw`
      SELECT id
      FROM permissions
      WHERE permission_key = ${key}
      LIMIT 1
    `;

    if (rows[0]) {
      resolvedIds.add(Number(rows[0].id));
    } else {
      missingPermissions.push(key);
    }
  }

  if (missingPermissions.length) {
    throw new AppError(`Permission not found: ${missingPermissions.join(', ')}`, 400);
  }

  return Array.from(resolvedIds);
};

const replaceRolePermissions = async (client, roleId, permissionIds) => {
  const role = await assertRoleExists(client, roleId);
  const roleTenantId = normalizeOptionalTenantId(role.tenant_id);

  await client.$executeRaw`
    DELETE FROM role_permissions
    WHERE role_id = ${roleId}
      AND tenant_id <=> ${roleTenantId}
  `;

  for (const permissionId of permissionIds) {
    await client.$executeRaw`
      INSERT INTO role_permissions (tenant_id, role_id, permission_id)
      VALUES (${roleTenantId}, ${roleId}, ${permissionId})
    `;
  }
};

const assertRoleExists = async (client, id) => {
  const role = await getRoleRowById(client, id);

  if (!role) {
    throw new AppError('Role not found.', 404);
  }

  return role;
};

const assertSystemRoleCanBeChanged = (role) => {
  if (role.role_name === SYSTEM_SUPER_ADMIN_ROLE) {
    throw new AppError('Super Admin role cannot be edited or deleted.', 403);
  }
};

const assertSystemRoleCanBeDeleted = (role) => {
  assertSystemRoleCanBeChanged(role);
};

const assertPermissionsCanBeChanged = (role, requester = {}) => {
  assertSystemRoleCanBeChanged(role);
};

const buildRoleResponse = async (client, id) => {
  const role = await assertRoleExists(client, id);
  const permissions = await getRolePermissions(client, id);

  return {
    ...mapRole(role),
    permissions,
  };
};

const hasPermissionPayload = (payload = {}) => (
  Object.prototype.hasOwnProperty.call(payload, 'permissions') ||
  Object.prototype.hasOwnProperty.call(payload, 'permissionIds') ||
  Object.prototype.hasOwnProperty.call(payload, 'permissionKeys')
);

const logRoleAudit = (client, requester = {}, entry = {}) => auditService.recordAuditLog(client, {
  tenantId: entry.tenantId,
  actorUserId: requester?.admin?.id || null,
  branchId: entry.branchId ?? requester?.audit?.branchId ?? null,
  roleId: requester?.audit?.roleId || requester?.admin?.roleId || requester?.admin?.role_id || null,
  module: 'roles',
  targetType: 'role',
  ipAddress: requester?.audit?.ipAddress || null,
  userAgent: requester?.audit?.userAgent || null,
  ...entry,
});

export const rolesService = {
  async getPermissions(requester = {}) {
    const rows = await prisma.$queryRaw`
      SELECT
        id,
        permission_key,
        permission_name,
        display_label,
        description,
        page_path,
        module_name,
        action,
        sort_order,
        created_at
      FROM permissions
      ORDER BY module_name ASC, sort_order ASC, permission_key ASC
    `;

    return filterPermissionsForRequester(rows.map(mapPermission), requester);
  },

  async createRole(payload, requester = {}) {
    await assertNoBranchScopeInjection(payload, requester);
    const roleName = normalizeRoleName(payload.roleName || payload.name);
    assertBranchRoleNameAllowed(roleName, requester);
    const roleTenantId = resolveRoleTenantId(payload, requester);
    const roleBranchId = await resolveRoleBranchId(prisma, payload, requester, roleTenantId);
    const roleScopeKey = getRoleScopeKey(roleBranchId);
    const actorId = requester?.admin?.id || null;

    const existingRole = await getRoleByName(prisma, roleName, roleTenantId, roleBranchId);
    if (existingRole) {
      throw new AppError('Role with the same name already exists.', 409);
    }

    return prisma.$transaction(async (tx) => {
      const permissionIds = await resolvePermissionIds(tx, payload);
      await assertPermissionBoundary(tx, permissionIds, requester);

      await tx.$executeRaw`
        INSERT INTO roles (tenant_id, branch_id, role_scope_key, role_name, description, status, is_system_role, created_by, updated_by)
        VALUES (${roleTenantId}, ${roleBranchId}, ${roleScopeKey}, ${roleName}, ${payload.description || null}, ${payload.status || 'active'}, false, ${actorId}, ${actorId})
      `;

      const createdRole = await getRoleByName(tx, roleName, roleTenantId, roleBranchId);

      await replaceRolePermissions(tx, Number(createdRole.id), permissionIds);

      const createdResponse = await buildRoleResponse(tx, Number(createdRole.id));
      await logRoleAudit(tx, requester, {
        tenantId: createdResponse.tenantId,
        action: 'role.created',
        targetId: createdResponse.id,
        oldValue: null,
        newValue: createdResponse,
      });

      if (permissionIds.length) {
        await logRoleAudit(tx, requester, {
          tenantId: createdResponse.tenantId,
          action: 'role.permissions.updated',
          targetId: createdResponse.id,
          oldValue: { permissions: [] },
          newValue: { permissions: createdResponse.permissions },
        });
      }

      if (requester?.isSuperAdmin && createdResponse.tenantId === null) {
        await propagateGlobalRoleToTenants(tx, {
          globalRoleId: createdResponse.id,
          actorId,
        });
      }

      return createdResponse;
    });
  },

  async getRoles(query, requester = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;
    if (!requester?.isSuperAdmin && !requester?.branchId && query.branchId) {
      await ensureBranchBelongsToTenant(prisma, {
        tenantId: requester?.tenantId,
        branchId: query.branchId,
      });
    }
    const scope = buildRoleScopeWhere(query, requester);

    const items = await prisma.$queryRawUnsafe(`
      SELECT
        r.id,
        r.tenant_id,
        r.branch_id,
        r.role_scope_key,
        r.role_name,
        r.description,
        r.status,
        r.is_system_role,
        r.created_by,
        r.updated_by,
        r.created_at,
        r.updated_at,
        COUNT(a.id) AS assigned_users
      FROM roles r
      LEFT JOIN admins a ON a.role_id = r.id
      WHERE ${scope.sql}
        AND (? IS NULL OR r.status = ?)
        AND (? IS NULL
          OR r.role_name LIKE CONCAT('%', ?, '%')
          OR r.description LIKE CONCAT('%', ?, '%'))
      GROUP BY r.id, r.tenant_id, r.branch_id, r.role_scope_key, r.role_name, r.description, r.status, r.is_system_role, r.created_by, r.updated_by, r.created_at, r.updated_at
      ORDER BY r.is_system_role DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `, ...scope.values, status, status, search, search, search, limit, skip);

    const totalRows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS total
      FROM roles r
      WHERE ${scope.sql}
        AND (? IS NULL OR r.status = ?)
        AND (? IS NULL
          OR r.role_name LIKE CONCAT('%', ?, '%')
          OR r.description LIKE CONCAT('%', ?, '%'))
    `, ...scope.values, status, status, search, search, search);

    return {
      items: items.map(mapRole),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },

  async getRoleById(id, requester = {}) {
    const role = await assertRoleExists(prisma, id);
    assertCanAccessRole(role, requester);
    return buildRoleResponse(prisma, id);
  },

  async getRolePermissionsById(id, requester = {}) {
    const role = await assertRoleExists(prisma, id);
    assertCanAccessRole(role, requester);
    return {
      role: mapRole(role),
      permissions: await getRolePermissions(prisma, id),
    };
  },

  async updateRole(id, payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      await assertNoBranchScopeInjection(payload, requester, id);
      const existingRole = await assertRoleExists(tx, id);
      assertCanAccessRole(existingRole, requester);
      assertSystemRoleCanBeChanged(existingRole);
      assertBranchRoleCanBeChanged(existingRole, requester);

      if (!requester?.isSuperAdmin && normalizeOptionalTenantId(existingRole.tenant_id) === null) {
        const tenantId = normalizeOptionalTenantId(requester?.tenantId);
        const actorId = requester?.admin?.id || null;
        const oldResponse = await buildRoleResponse(tx, id);
        const tenantRoleId = await ensureTenantCopyOfRole(tx, {
          globalRole: existingRole,
          tenantId,
          actorId,
          payload,
        });

        if (hasPermissionPayload(payload)) {
          const permissionIds = await resolvePermissionIds(tx, payload);
          await assertPermissionBoundary(tx, permissionIds, requester);
          await replaceRolePermissions(tx, tenantRoleId, permissionIds);
        }

        const tenantResponse = await buildRoleResponse(tx, tenantRoleId);
        await logRoleAudit(tx, requester, {
          tenantId,
          action: 'role.updated',
          targetId: tenantResponse.id,
          oldValue: oldResponse,
          newValue: tenantResponse,
        });

        if (hasPermissionPayload(payload)) {
          await logRoleAudit(tx, requester, {
            tenantId,
            action: 'role.permissions.updated',
            targetId: tenantResponse.id,
            oldValue: { permissions: oldResponse.permissions },
            newValue: { permissions: tenantResponse.permissions },
          });
        }

        return tenantResponse;
      }

      const oldResponse = await buildRoleResponse(tx, id);

      const nextRoleName = payload.roleName || payload.name ? normalizeRoleName(payload.roleName || payload.name) : existingRole.role_name;
      const roleTenantId = normalizeOptionalTenantId(existingRole.tenant_id);
      const roleBranchId = normalizeOptionalBranchId(existingRole.branch_id);
      const nextStatus = payload.status || existingRole.status || 'active';
      const actorId = requester?.admin?.id || null;

      if (payload.roleName || payload.name) {
        assertBranchRoleNameAllowed(nextRoleName, requester);
        const duplicateRole = await getRoleByName(tx, nextRoleName, roleTenantId, roleBranchId, id);
        if (duplicateRole) {
          throw new AppError('Another role with the same name already exists.', 409);
        }
      }

      await tx.$executeRaw`
        UPDATE roles
        SET
          role_name = ${nextRoleName},
          description = ${payload.description === undefined ? existingRole.description : payload.description || null},
          status = ${nextStatus},
          updated_by = ${actorId},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      if (hasPermissionPayload(payload)) {
        const permissionIds = await resolvePermissionIds(tx, payload);
        await assertPermissionBoundary(tx, permissionIds, requester);
        await replaceRolePermissions(tx, id, permissionIds);
      }

      const updatedResponse = await buildRoleResponse(tx, id);
      await logRoleAudit(tx, requester, {
        tenantId: updatedResponse.tenantId,
        action: nextStatus === 'inactive' && oldResponse.status !== 'inactive' ? 'role.deactivated' : 'role.updated',
        targetId: updatedResponse.id,
        oldValue: oldResponse,
        newValue: updatedResponse,
      });

      if (hasPermissionPayload(payload)) {
        await logRoleAudit(tx, requester, {
          tenantId: updatedResponse.tenantId,
          action: 'role.permissions.updated',
          targetId: updatedResponse.id,
          oldValue: { permissions: oldResponse.permissions },
          newValue: { permissions: updatedResponse.permissions },
        });
      }

      if (requester?.isSuperAdmin && updatedResponse.tenantId === null) {
        await propagateGlobalRoleToTenants(tx, {
          globalRoleId: updatedResponse.id,
          actorId,
        });
      }

      return updatedResponse;
    });
  },

  async deleteRole(id, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const existingRole = await assertRoleExists(tx, id);
      assertCanAccessRole(existingRole, requester);
      assertSystemRoleCanBeDeleted(existingRole);
      assertBranchRoleCanBeChanged(existingRole, requester);
      assertNotCurrentRequesterRole(existingRole, requester);

      if (!requester?.isSuperAdmin && normalizeOptionalTenantId(existingRole.tenant_id) === null) {
        const tenantId = normalizeOptionalTenantId(requester?.tenantId);
        const actorId = requester?.admin?.id || null;
        const oldResponse = await buildRoleResponse(tx, id);
        const tenantRoleId = await ensureTenantCopyOfRole(tx, {
          globalRole: existingRole,
          tenantId,
          actorId,
          payload: { status: 'inactive' },
        });

        await tx.$executeRaw`
          UPDATE roles
          SET status = 'inactive',
              updated_by = ${actorId},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${tenantRoleId}
        `;

        const hiddenResponse = await buildRoleResponse(tx, tenantRoleId);
        await logRoleAudit(tx, requester, {
          tenantId,
          action: 'role.deactivated',
          targetId: hiddenResponse.id,
          oldValue: oldResponse,
          newValue: hiddenResponse,
        });

        return hiddenResponse;
      }

      const oldResponse = await buildRoleResponse(tx, id);

      const assignedRows = await tx.$queryRaw`
        SELECT COUNT(*) AS total
        FROM admins
        WHERE role_id = ${id}
      `;

      const assignedUsers = Number(assignedRows[0]?.total || 0);
      if (assignedUsers > 0) {
        throw new AppError('This role is assigned to users. Please change those users to another role before deleting it.', 409);
      }

      if (requester?.isSuperAdmin && normalizeOptionalTenantId(existingRole.tenant_id) === null) {
        const matchingAssignedRows = await tx.$queryRaw`
          SELECT COUNT(a.id) AS total
          FROM roles r
          INNER JOIN admins a ON a.role_id = r.id
          WHERE r.tenant_id IS NOT NULL
            AND r.role_name = ${existingRole.role_name}
        `;

        const matchingAssignedUsers = Number(matchingAssignedRows[0]?.total || 0);
        if (matchingAssignedUsers > 0) {
          throw new AppError('This global role is assigned inside tenants. Please change those users to another role before deleting it.', 409);
        }

        await tx.$executeRaw`
          DELETE rp
          FROM role_permissions rp
          INNER JOIN roles r ON r.id = rp.role_id
          WHERE r.tenant_id IS NOT NULL
            AND r.role_name = ${existingRole.role_name}
        `;

        await tx.$executeRaw`
          DELETE FROM roles
          WHERE tenant_id IS NOT NULL
            AND role_name = ${existingRole.role_name}
        `;
      }

      await tx.$executeRaw`
        DELETE FROM roles
        WHERE id = ${id}
      `;

      await logRoleAudit(tx, requester, {
        tenantId: normalizeOptionalTenantId(existingRole.tenant_id),
        action: 'role.deleted',
        targetId: Number(existingRole.id),
        oldValue: oldResponse,
        newValue: null,
      });

      return mapRole(existingRole);
    });
  },

  async assignPermissionsToRole(id, payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      await assertNoBranchScopeInjection(payload, requester, id);
      const existingRole = await assertRoleExists(tx, id);
      assertCanAccessRole(existingRole, requester);
      assertPermissionsCanBeChanged(existingRole, requester);
      assertBranchRoleCanBeChanged(existingRole, requester);

      if (!requester?.isSuperAdmin && normalizeOptionalTenantId(existingRole.tenant_id) === null) {
        const tenantId = normalizeOptionalTenantId(requester?.tenantId);
        const actorId = requester?.admin?.id || null;
        const oldResponse = await buildRoleResponse(tx, id);
        const tenantRoleId = await ensureTenantCopyOfRole(tx, {
          globalRole: existingRole,
          tenantId,
          actorId,
        });
        const permissionIds = await resolvePermissionIds(tx, payload);
        await assertPermissionBoundary(tx, permissionIds, requester);
        await replaceRolePermissions(tx, tenantRoleId, permissionIds);

        const updatedResponse = await buildRoleResponse(tx, tenantRoleId);
        await logRoleAudit(tx, requester, {
          tenantId,
          action: 'role.permissions.updated',
          targetId: updatedResponse.id,
          oldValue: { permissions: oldResponse.permissions },
          newValue: { permissions: updatedResponse.permissions },
        });

        return updatedResponse;
      }

      const oldResponse = await buildRoleResponse(tx, id);

      const permissionIds = await resolvePermissionIds(tx, payload);
      await assertPermissionBoundary(tx, permissionIds, requester);
      await replaceRolePermissions(tx, id, permissionIds);

      const updatedResponse = await buildRoleResponse(tx, id);
      await logRoleAudit(tx, requester, {
        tenantId: updatedResponse.tenantId,
        action: 'role.permissions.updated',
        targetId: updatedResponse.id,
        oldValue: { permissions: oldResponse.permissions },
        newValue: { permissions: updatedResponse.permissions },
      });

      if (requester?.isSuperAdmin && updatedResponse.tenantId === null) {
        await propagateGlobalRoleToTenants(tx, {
          globalRoleId: updatedResponse.id,
          actorId: requester?.admin?.id || null,
        });
      }

      return updatedResponse;
    });
  },
};
