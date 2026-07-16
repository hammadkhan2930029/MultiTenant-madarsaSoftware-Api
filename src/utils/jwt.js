import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateAdminToken = (admin) =>
  jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: admin.roleDetails?.roleName || admin.roleDetails?.role_name || admin.assignedRole?.roleName || admin.assignedRole?.role_name || admin.role,
      roleId: admin.roleId || admin.role_id || admin.roleDetails?.id || admin.assignedRole?.id || null,
      tenantId: admin.tenantId || admin.tenant_id || null,
      branchId: admin.branchId || admin.branch_id || null,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
