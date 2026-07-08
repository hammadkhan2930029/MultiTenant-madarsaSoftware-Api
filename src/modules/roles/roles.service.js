import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { auditService } from '../security/index.js';

const SYSTEM_SUPER_ADMIN_ROLE = 'super_admin';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const mapRole = (row) => ({
  id: Number(row.id),
  tenantId: toNumber(row.tenant_id),
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

const assertCanAccessRole = (role, requester = {}) => {
  if (requester?.isSuperAdmin) return;

  const roleTenantId = normalizeOptionalTenantId(role?.tenant_id);
  const requestTenantId = normalizeOptionalTenantId(requester?.tenantId);

  if (roleTenantId !== null && roleTenantId !== requestTenantId) {
    throw new AppError('Role not found.', 404);
  }
};

const buildRoleScopeWhere = (query = {}, requester = {}) => {
  if (!requester?.isSuperAdmin) {
    const tenantId = normalizeOptionalTenantId(requester?.tenantId);

    return {
      sql: `(
        r.tenant_id = ?
        OR (
          r.tenant_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM roles tenant_role
            WHERE tenant_role.tenant_id = ?
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
  if (query.scope === 'tenant' || queryTenantId) {
    return { sql: 'r.tenant_id = ?', values: [queryTenantId] };
  }

  return { sql: '1 = 1', values: [] };
};

const getRoleRowById = async (client, id) => {
  const rows = await client.$queryRaw`
    SELECT
      r.id,
      r.tenant_id,
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
    GROUP BY r.id, r.tenant_id, r.role_name, r.description, r.status, r.is_system_role, r.created_by, r.updated_by, r.created_at, r.updated_at
    LIMIT 1
  `;

  return rows[0] || null;
};

const getRoleByName = async (client, roleName, tenantId, excludeId = null) => {
  const rows = excludeId
    ? await client.$queryRaw`
        SELECT id, tenant_id, role_name
        FROM roles
        WHERE role_name = ${roleName}
          AND tenant_id <=> ${tenantId}
          AND id <> ${excludeId}
        LIMIT 1
      `
    : await client.$queryRaw`
        SELECT id, tenant_id, role_name
        FROM roles
        WHERE role_name = ${roleName}
          AND tenant_id <=> ${tenantId}
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
    INSERT INTO roles (tenant_id, role_name, description, status, is_system_role, created_by, updated_by)
    VALUES (
      ${tenantId},
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
  module: 'roles',
  targetType: 'role',
  ipAddress: requester?.audit?.ipAddress || null,
  userAgent: requester?.audit?.userAgent || null,
  ...entry,
});

export const rolesService = {
  async getPermissions() {
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

    return rows.map(mapPermission);
  },

  async createRole(payload, requester = {}) {
    const roleName = normalizeRoleName(payload.roleName || payload.name);
    const roleTenantId = resolveRoleTenantId(payload, requester);
    const actorId = requester?.admin?.id || null;

    const existingRole = await getRoleByName(prisma, roleName, roleTenantId);
    if (existingRole) {
      throw new AppError('Role with the same name already exists.', 409);
    }

    return prisma.$transaction(async (tx) => {
      const permissionIds = await resolvePermissionIds(tx, payload);

      await tx.$executeRaw`
        INSERT INTO roles (tenant_id, role_name, description, status, is_system_role, created_by, updated_by)
        VALUES (${roleTenantId}, ${roleName}, ${payload.description || null}, ${payload.status || 'active'}, false, ${actorId}, ${actorId})
      `;

      const createdRole = await getRoleByName(tx, roleName, roleTenantId);

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
    const scope = buildRoleScopeWhere(query, requester);

    const items = await prisma.$queryRawUnsafe(`
      SELECT
        r.id,
        r.tenant_id,
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
      GROUP BY r.id, r.tenant_id, r.role_name, r.description, r.status, r.is_system_role, r.created_by, r.updated_by, r.created_at, r.updated_at
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
      const existingRole = await assertRoleExists(tx, id);
      assertCanAccessRole(existingRole, requester);
      assertSystemRoleCanBeChanged(existingRole);

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
      const nextStatus = payload.status || existingRole.status || 'active';
      const actorId = requester?.admin?.id || null;

      if (payload.roleName || payload.name) {
        const duplicateRole = await getRoleByName(tx, nextRoleName, roleTenantId, id);
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
      const existingRole = await assertRoleExists(tx, id);
      assertCanAccessRole(existingRole, requester);
      assertPermissionsCanBeChanged(existingRole, requester);

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
