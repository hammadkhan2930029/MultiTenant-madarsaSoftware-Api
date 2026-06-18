import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const SYSTEM_SUPER_ADMIN_ROLE = 'super_admin';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const mapRole = (row) => ({
  id: Number(row.id),
  roleName: row.role_name,
  description: row.description,
  createdBy: toNumber(row.created_by),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  assignedUsers: row.assigned_users === undefined ? undefined : Number(row.assigned_users),
});

const mapPermission = (row) => ({
  id: Number(row.id),
  permissionKey: row.permission_key,
  permissionName: row.permission_name,
  pagePath: row.page_path,
  moduleName: row.module_name,
  createdAt: row.created_at,
});

const normalizeRoleName = (roleName) => String(roleName || '').trim();

const getRoleRowById = async (client, id) => {
  const rows = await client.$queryRaw`
    SELECT
      r.id,
      r.role_name,
      r.description,
      r.created_by,
      r.created_at,
      r.updated_at,
      COUNT(a.id) AS assigned_users
    FROM roles r
    LEFT JOIN admins a ON a.role_id = r.id
    WHERE r.id = ${id}
    GROUP BY r.id, r.role_name, r.description, r.created_by, r.created_at, r.updated_at
    LIMIT 1
  `;

  return rows[0] || null;
};

const getRoleByName = async (client, roleName, excludeId = null) => {
  const rows = excludeId
    ? await client.$queryRaw`
        SELECT id, role_name
        FROM roles
        WHERE role_name = ${roleName} AND id <> ${excludeId}
        LIMIT 1
      `
    : await client.$queryRaw`
        SELECT id, role_name
        FROM roles
        WHERE role_name = ${roleName}
        LIMIT 1
      `;

  return rows[0] || null;
};

const getRolePermissions = async (client, roleId) => {
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
  await client.$executeRaw`
    DELETE FROM role_permissions
    WHERE role_id = ${roleId}
  `;

  for (const permissionId of permissionIds) {
    await client.$executeRaw`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (${roleId}, ${permissionId})
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

const buildRoleResponse = async (client, id) => {
  const role = await assertRoleExists(client, id);
  const permissions = await getRolePermissions(client, id);

  return {
    ...mapRole(role),
    permissions,
  };
};

export const rolesService = {
  async getPermissions() {
    const rows = await prisma.$queryRaw`
      SELECT id, permission_key, permission_name, page_path, module_name, created_at
      FROM permissions
      ORDER BY module_name ASC, permission_key ASC
    `;

    return rows.map(mapPermission);
  },

  async createRole(payload, admin) {
    const roleName = normalizeRoleName(payload.roleName);

    const existingRole = await getRoleByName(prisma, roleName);
    if (existingRole) {
      throw new AppError('Role with the same name already exists.', 409);
    }

    return prisma.$transaction(async (tx) => {
      const permissionIds = await resolvePermissionIds(tx, payload);

      await tx.$executeRaw`
        INSERT INTO roles (role_name, description, created_by)
        VALUES (${roleName}, ${payload.description || null}, ${admin?.id || null})
      `;

      const createdRole = await getRoleByName(tx, roleName);

      await replaceRolePermissions(tx, Number(createdRole.id), permissionIds);

      return buildRoleResponse(tx, Number(createdRole.id));
    });
  },

  async getRoles(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;

    const items = await prisma.$queryRaw`
      SELECT
        r.id,
        r.role_name,
        r.description,
        r.created_by,
        r.created_at,
        r.updated_at,
        COUNT(a.id) AS assigned_users
      FROM roles r
      LEFT JOIN admins a ON a.role_id = r.id
      WHERE ${search} IS NULL
        OR r.role_name LIKE CONCAT('%', ${search}, '%')
        OR r.description LIKE CONCAT('%', ${search}, '%')
      GROUP BY r.id, r.role_name, r.description, r.created_by, r.created_at, r.updated_at
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS total
      FROM roles r
      WHERE ${search} IS NULL
        OR r.role_name LIKE CONCAT('%', ${search}, '%')
        OR r.description LIKE CONCAT('%', ${search}, '%')
    `;

    return {
      items: items.map(mapRole),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },

  async getRoleById(id) {
    return buildRoleResponse(prisma, id);
  },

  async updateRole(id, payload) {
    return prisma.$transaction(async (tx) => {
      const existingRole = await assertRoleExists(tx, id);
      assertSystemRoleCanBeChanged(existingRole);

      const nextRoleName = payload.roleName ? normalizeRoleName(payload.roleName) : existingRole.role_name;

      if (payload.roleName) {
        const duplicateRole = await getRoleByName(tx, nextRoleName, id);
        if (duplicateRole) {
          throw new AppError('Another role with the same name already exists.', 409);
        }
      }

      await tx.$executeRaw`
        UPDATE roles
        SET
          role_name = ${nextRoleName},
          description = ${payload.description === undefined ? existingRole.description : payload.description || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      if (
        Object.prototype.hasOwnProperty.call(payload, 'permissions') ||
        Object.prototype.hasOwnProperty.call(payload, 'permissionIds') ||
        Object.prototype.hasOwnProperty.call(payload, 'permissionKeys')
      ) {
        const permissionIds = await resolvePermissionIds(tx, payload);
        await replaceRolePermissions(tx, id, permissionIds);
      }

      return buildRoleResponse(tx, id);
    });
  },

  async deleteRole(id) {
    return prisma.$transaction(async (tx) => {
      const existingRole = await assertRoleExists(tx, id);
      assertSystemRoleCanBeChanged(existingRole);

      const assignedRows = await tx.$queryRaw`
        SELECT COUNT(*) AS total
        FROM admins
        WHERE role_id = ${id}
      `;

      const assignedUsers = Number(assignedRows[0]?.total || 0);
      if (assignedUsers > 0) {
        throw new AppError('This role is assigned to users. Please change those users to another role before deleting it.', 409);
      }

      await tx.$executeRaw`
        DELETE FROM roles
        WHERE id = ${id}
      `;

      return mapRole(existingRole);
    });
  },

  async assignPermissionsToRole(id, payload) {
    return prisma.$transaction(async (tx) => {
      const existingRole = await assertRoleExists(tx, id);
      assertSystemRoleCanBeChanged(existingRole);

      const permissionIds = await resolvePermissionIds(tx, payload);
      await replaceRolePermissions(tx, id, permissionIds);

      return buildRoleResponse(tx, id);
    });
  },
};
