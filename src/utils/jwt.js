import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateAdminToken = (admin) =>
  jwt.sign(
    {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
