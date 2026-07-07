import { prisma } from '../../config/prisma.js';
import { permissionService } from './permission.service.js';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

export const rolePermissionService = {
  async getRolePermissions(role, client = prisma) {
    if (role?.role_name === 'super_admin' && toNumber(role?.tenant_id) === null) {
      return permissionService.getAll(client);
    }

    if (!role?.id) return [];

    const roleTenantId = toNumber(role.tenant_id);
    const rows = await client.$queryRaw`
      SELECT
        p.id,
        p.permission_key,
        p.permission_name,
        p.display_label,
        p.description,
        p.page_path,
        p.module_name,
        p.action,
        p.sort_order,
        p.created_at
      FROM role_permissions rp
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = ${Number(role.id)}
        AND rp.tenant_id <=> ${roleTenantId}
      ORDER BY p.module_name ASC, p.sort_order ASC, p.permission_key ASC
    `;

    return rows.map(permissionService.mapPermission);
  },

  async getRolePermissionKeys(role, client = prisma) {
    const permissions = await this.getRolePermissions(role, client);
    return permissions.map((permission) => permission.permissionKey);
  },
};
