import { AppError } from '../utils/appError.js';
import { authorizationService } from '../modules/rbac/authorization.service.js';
import { normalizePermissions } from '../modules/rbac/rbac.utils.js';

export const requireSuperAdmin = (req, _res, next) => {
  if (req.auth?.isSuperAdmin) {
    return next();
  }

  return next(new AppError('Super Admin access is required.', 403));
};

export const requireTenantAdmin = (req, _res, next) => {
  if (req.auth?.isTenantAdmin) {
    return next();
  }

  return next(new AppError('Tenant Admin access is required.', 403));
};

export const requireTenantContext = (req, _res, next) => {
  if (req.tenantId && req.tenant) {
    return next();
  }

  return next(new AppError('Tenant context is required.', 403));
};

export const blockSuperAdminTenantDataAccess = (req, _res, next) => {
  if (req.auth?.isSuperAdmin) {
    return next(new AppError('Super Admin tenant data access must use an explicit tenant-scoped workflow.', 403));
  }

  return next();
};

export const requireAnyPermission = (...permissions) => {
  const requiredPermissions = normalizePermissions(permissions.flat());

  return (req, _res, next) => {
    try {
      if (!req.auth) {
        throw new AppError('Authentication is required.', 401);
      }

      authorizationService.assertAnyPermission(req.auth, requiredPermissions);
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requireAllPermissions = (...permissions) => {
  const requiredPermissions = normalizePermissions(permissions.flat());

  return (req, _res, next) => {
    try {
      if (!req.auth) {
        throw new AppError('Authentication is required.', 401);
      }

      authorizationService.assertAllPermissions(req.auth, requiredPermissions);
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requirePermission = requireAnyPermission;
