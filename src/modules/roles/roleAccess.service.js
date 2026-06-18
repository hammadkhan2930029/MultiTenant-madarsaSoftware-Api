import { prisma } from '../../config/prisma.js';

const SUPER_ADMIN_ROLE = 'super_admin';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

export const mapRoleRow = (row) => {
  if (!row) return null;

  return {
    id: toNumber(row.id),
    roleName: row.role_name,
    description: row.description,
    createdBy: toNumber(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapPermissionRow = (row) => ({
  id: Number(row.id),
  permissionKey: row.permission_key,
  permissionName: row.permission_name,
  pagePath: row.page_path,
  moduleName: row.module_name,
  createdAt: row.created_at,
});

export const getRoleById = async (roleId, client = prisma) => {
  if (!roleId) return null;

  const rows = await client.$queryRaw`
    SELECT id, role_name, description, created_by, created_at, updated_at
    FROM roles
    WHERE id = ${roleId}
    LIMIT 1
  `;

  return rows[0] || null;
};

export const getRoleByName = async (roleName, client = prisma) => {
  if (!roleName) return null;

  const rows = await client.$queryRaw`
    SELECT id, role_name, description, created_by, created_at, updated_at
    FROM roles
    WHERE role_name = ${roleName}
    LIMIT 1
  `;

  return rows[0] || null;
};

export const getRolePermissions = async (role, client = prisma) => {
  if (role?.role_name === SUPER_ADMIN_ROLE) {
    const rows = await client.$queryRaw`
      SELECT id, permission_key, permission_name, page_path, module_name, created_at
      FROM permissions
      ORDER BY module_name ASC, permission_key ASC
    `;

    return rows.map(mapPermissionRow);
  }

  if (!role?.id) return [];

  const rows = await client.$queryRaw`
    SELECT p.id, p.permission_key, p.permission_name, p.page_path, p.module_name, p.created_at
    FROM role_permissions rp
    INNER JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ${Number(role.id)}
    ORDER BY p.module_name ASC, p.permission_key ASC
  `;

  return rows.map(mapPermissionRow);
};

export const getAdminRoleAndPermissions = async (admin, client = prisma) => {
  if (!admin?.id) {
    return {
      role: null,
      permissions: [],
      permissionKeys: [],
    };
  }

  let rows;

  try {
    rows = await client.$queryRaw`
      SELECT role_id, role
      FROM admins
      WHERE id = ${Number(admin.id)}
      LIMIT 1
    `;
  } catch {
    const fallbackRole = admin.role
      ? {
          id: null,
          role_name: admin.role,
          description: null,
          created_by: null,
          created_at: null,
          updated_at: null,
        }
      : null;

    return {
      role: mapRoleRow(fallbackRole),
      permissions: [],
      permissionKeys: [],
    };
  }

  const adminRoleState = rows[0] || {};
  const roleById = await getRoleById(adminRoleState.role_id, client);
  const fallbackRoleName = adminRoleState.role || admin.role || null;
  const roleByName = roleById ? null : await getRoleByName(fallbackRoleName, client);

  const role =
    roleById ||
    roleByName ||
    (fallbackRoleName
      ? {
          id: null,
          role_name: fallbackRoleName,
          description: null,
          created_by: null,
          created_at: null,
          updated_at: null,
        }
      : null);

  const permissions = await getRolePermissions(role, client);

  return {
    role: mapRoleRow(role),
    permissions,
    permissionKeys: permissions.map((permission) => permission.permissionKey),
  };
};
