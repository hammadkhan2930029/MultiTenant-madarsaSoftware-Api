import { AppError } from '../utils/appError.js';
import { authorizationService } from '../modules/rbac/authorization.service.js';
import { normalizePermissions } from '../modules/rbac/rbac.utils.js';

export const requireSuperAdmin = (req, _res, next) => {
  if (req.auth?.isSuperAdmin) {
    return next();
  }

  return next(new AppError('آپ کو اس عمل کی اجازت نہیں ہے۔', 403));
};

export const requireTenantAdmin = (req, _res, next) => {
  if (req.auth?.isTenantAdmin) {
    return next();
  }

  return next(new AppError('یہ عمل صرف ایڈمن کر سکتا ہے۔', 403));
};

export const requireTenantContext = (req, _res, next) => {
  if (req.tenantId && req.tenant) {
    return next();
  }

  return next(new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔ دوبارہ لاگ اِن کریں۔', 403));
};

export const blockSuperAdminTenantDataAccess = (req, _res, next) => {
  if (req.auth?.isSuperAdmin) {
    return next(new AppError('اس ڈیٹا تک رسائی کے لیے واضح tenant-scoped workflow استعمال کریں۔', 403));
  }

  return next();
};

const isBranchScopedUser = (req) => Boolean(req.auth?.branchId && !req.auth?.isTenantAdmin && !req.auth?.isSuperAdmin);

export const blockBranchScopedPermissionManagement = (req, _res, next) => {
  if (isBranchScopedUser(req)) {
    return next(new AppError('برانچ یوزر رولز یا اجازتیں تبدیل نہیں کر سکتا۔', 403));
  }

  return next();
};

export const blockBranchScopedUserManagementWrites = (req, _res, next) => {
  if (isBranchScopedUser(req) && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next(new AppError('برانچ یوزر یوزرز کا انتظام نہیں کر سکتا۔', 403));
  }

  return next();
};

export const requireAnyPermission = (...permissions) => {
  const requiredPermissions = normalizePermissions(permissions.flat());

  return (req, _res, next) => {
    try {
      if (!req.auth) {
        throw new AppError('لاگ اِن ضروری ہے۔', 401);
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
        throw new AppError('لاگ اِن ضروری ہے۔', 401);
      }

      authorizationService.assertAllPermissions(req.auth, requiredPermissions);
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

export const requirePermission = requireAnyPermission;
