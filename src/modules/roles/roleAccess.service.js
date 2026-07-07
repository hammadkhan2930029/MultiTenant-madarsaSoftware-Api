import { prisma } from '../../config/prisma.js';
import { rolePermissionService } from '../rbac/role-permission.service.js';

const SUPER_ADMIN_ROLE = 'super_admin';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

export const mapRoleRow = (row) => {
  if (!row) return null;

  return {
    id: toNumber(row.id),
    tenantId: toNumber(row.tenant_id),
    roleName: row.role_name,
    description: row.description,
    status: row.status || 'active',
    isSystemRole: Boolean(row.is_system_role),
    createdBy: toNumber(row.created_by),
    updatedBy: toNumber(row.updated_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const getRoleById = async (roleId, client = prisma) => {
  if (!roleId) return null;

    const rows = await client.$queryRaw`
    SELECT id, tenant_id, role_name, description, status, is_system_role, created_by, updated_by, created_at, updated_at
    FROM roles
    WHERE id = ${roleId}
    LIMIT 1
  `;

  return rows[0] || null;
};

export const getRoleByName = async (roleName, client = prisma, tenantId = null) => {
  if (!roleName) return null;

  const rows = await client.$queryRaw`
    SELECT id, tenant_id, role_name, description, status, is_system_role, created_by, updated_by, created_at, updated_at
    FROM roles
    WHERE role_name = ${roleName}
      AND tenant_id <=> ${tenantId}
    LIMIT 1
  `;

  return rows[0] || null;
};

export const getRolePermissions = (role, client = prisma) => rolePermissionService.getRolePermissions(role, client);

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
      SELECT role_id, role, tenant_id
      FROM admins
      WHERE id = ${Number(admin.id)}
      LIMIT 1
    `;
  } catch {
    const fallbackRole = admin.role
      ? {
          id: null,
          tenant_id: null,
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
  const adminTenantId = toNumber(admin.tenantId ?? admin.tenant_id);

  const role = roleById && toNumber(roleById.tenant_id) === adminTenantId ? roleById : null;

  const permissions = await getRolePermissions(role, client);

  return {
    role: mapRoleRow(role),
    permissions,
    permissionKeys: permissions.map((permission) => permission.permissionKey),
  };
};
