import { AppError } from '../utils/appError.js';

const normalizePermissions = (permissions = []) => (
  Array.isArray(permissions) ? permissions.filter(Boolean) : []
);

const TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES = ['roles.', 'tenant_management.', 'tenants.'];

const canTenantAdminBypass = (permissions = []) => (
  !permissions.some((permission) =>
    TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES.some((prefix) => permission.startsWith(prefix))
  )
);

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
    if (req.auth?.isSuperAdmin || (req.auth?.isTenantAdmin && canTenantAdminBypass(requiredPermissions))) {
      return next();
    }

    const availablePermissions = new Set(req.auth?.permissionKeys || []);
    const hasPermission = requiredPermissions.some((permission) => availablePermissions.has(permission));

    if (hasPermission) {
      return next();
    }

    return next(new AppError('You do not have permission to perform this action.', 403));
  };
};

export const requireAllPermissions = (...permissions) => {
  const requiredPermissions = normalizePermissions(permissions.flat());

  return (req, _res, next) => {
    if (req.auth?.isSuperAdmin || (req.auth?.isTenantAdmin && canTenantAdminBypass(requiredPermissions))) {
      return next();
    }

    const availablePermissions = new Set(req.auth?.permissionKeys || []);
    const hasPermissions = requiredPermissions.every((permission) => availablePermissions.has(permission));

    if (hasPermissions) {
      return next();
    }

    return next(new AppError('You do not have permission to perform this action.', 403));
  };
};
