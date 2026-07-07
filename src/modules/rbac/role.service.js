import { prisma } from '../../config/prisma.js';
import { getAdminRoleAndPermissions, getRoleById, getRoleByName, mapRoleRow } from '../roles/roleAccess.service.js';

export const roleService = {
  mapRole: mapRoleRow,
  getRoleById,
  getRoleByName,
  getAdminRoleAndPermissions,

  async getTenantRoleByName(tenantId, roleName, client = prisma) {
    return getRoleByName(roleName, client, tenantId);
  },
};
