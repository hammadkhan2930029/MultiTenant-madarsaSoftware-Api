import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateAdminToken = (admin) =>
  jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: admin.roleDetails?.roleName || admin.roleDetails?.role_name || admin.assignedRole?.roleName || admin.assignedRole?.role_name || admin.role,
      tenantId: admin.tenantId || admin.tenant_id || null,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
