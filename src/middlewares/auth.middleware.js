import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../modules/auth/auth.service.js';
import { getAdminRoleAndPermissions } from '../modules/roles/roleAccess.service.js';
import { authorizationService } from '../modules/rbac/authorization.service.js';
import { auditService, branchScopeService, securityContextService } from '../modules/security/index.js';

const enforceRoutePermission = (req) => {
  authorizationService.enforceRoutePermission(req);
};

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

  const requestTenantId = securityContextService.normalizeTenantId(req.tenantId);
  const { isGlobalSuperAdminToken } = securityContextService.assertTokenTenantMatch({
    decodedToken,
    requestTenantId,
  });

  const admin = await authService.getAuthenticatedAdminById(decodedToken.adminId);

  if (!admin) {
    throw new AppError('Admin account not found.', 401);
  }

  if (admin.status !== 'active') {
    throw new AppError('Your account is inactive. Please contact support.', 403);
  }

  if (admin.tenantId && admin.tenantStatus !== 'active') {
    throw new AppError('Tenant is inactive. Please contact support.', 403);
  }

  if (admin.branchId && admin.branchStatus !== 'active') {
    throw new AppError('Assigned branch is inactive or not available. Please contact admin.', 403);
  }

  if (admin.branchId && admin.branchEnabled === false) {
    throw new AppError('Branch system is disabled for this tenant. Please contact admin.', 403);
  }

  const tokenBranchId = securityContextService.normalizeTenantId(decodedToken.branchId);
  if (tokenBranchId !== (admin.branchId || null)) {
    throw new AppError('Token branch does not match the current user branch.', 403);
  }

  const tokenRoleId = securityContextService.normalizeTenantId(decodedToken.roleId);
  if (tokenRoleId !== (admin.roleId || null)) {
    throw new AppError('Token role does not match the current user role. Please login again.', 403);
  }

  const adminTenantId = securityContextService.assertAdminTenantMatch({
    admin,
    requestTenantId,
    isGlobalSuperAdminToken,
  });

  const access = await getAdminRoleAndPermissions(admin);
  if (!access.role?.id) {
    throw new AppError('Assigned role is not valid. Please contact support.', 403);
  }

  if (access.role.status && access.role.status !== 'active') {
    throw new AppError('Assigned role is inactive. Please contact support.', 403);
  }

  const auth = securityContextService.buildAuthContext({
    admin,
    access,
    tenantId: adminTenantId,
  });

  req.admin = admin;
  req.auth = auth;
  req.security = securityContextService.buildSecurityContext({
    req,
    decodedToken,
    admin,
    auth,
  });
  branchScopeService.applyBranchScopeToRequest(req);

  try {
    enforceRoutePermission(req);
  } catch (error) {
    auditService.logAuthorizationDenied(req, {
      requiredPermission: authorizationService.getRequiredPermissionForRequest(req),
      reason: error.message,
    });
    throw error;
  }

  next();
});
