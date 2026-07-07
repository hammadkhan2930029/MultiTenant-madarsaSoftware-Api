import { prisma } from '../../config/prisma.js';

const CACHE_TTL_MS = 60 * 1000;
let allPermissionsCache = null;

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

export const permissionService = {
  mapPermission,

  async getAll(client = prisma) {
    const canUseCache = client === prisma;
    const now = Date.now();

    if (canUseCache && allPermissionsCache && allPermissionsCache.expiresAt > now) {
      return allPermissionsCache.items;
    }

    const rows = await client.$queryRaw`
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

    const permissions = rows.map(mapPermission);

    if (canUseCache) {
      allPermissionsCache = {
        items: permissions,
        expiresAt: now + CACHE_TTL_MS,
      };
    }

    return permissions;
  },

  async findByKey(permissionKey, client = prisma) {
    const rows = await client.$queryRaw`
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
      WHERE permission_key = ${permissionKey}
      LIMIT 1
    `;

    return rows[0] ? mapPermission(rows[0]) : null;
  },

  invalidateCache() {
    allPermissionsCache = null;
  },
};
