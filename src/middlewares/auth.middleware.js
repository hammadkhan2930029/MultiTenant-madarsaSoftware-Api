import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../modules/auth/auth.service.js';

export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AppError('Authorization token is required.', 401);
  }

  const token = authorizationHeader.split(' ')[1];

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired token.', 401);
  }

  const admin = await authService.getAuthenticatedAdminById(decodedToken.adminId);

  if (!admin) {
    throw new AppError('Admin account not found.', 401);
  }

  if (admin.status !== 'active') {
    throw new AppError('Your account is inactive. Please contact support.', 403);
  }

  req.admin = admin;
  next();
});
