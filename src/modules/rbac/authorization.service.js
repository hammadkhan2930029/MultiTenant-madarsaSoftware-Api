import { AppError } from '../../utils/appError.js';
import { MODULE_PERMISSION_MAP } from './rbac.constants.js';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isSuperAdmin,
  isTenantAdmin,
  normalizePermissions,
} from './rbac.utils.js';

const getActionForRequest = (req) => {
  if (req.method === 'GET') return 'view';
  if (req.method === 'POST') return 'create';
  if (req.method === 'DELETE') return 'delete';
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return /\/(deactivate|delete|remove)(\/|$)/i.test(req.originalUrl) ? 'delete' : 'update';
  }

  return null;
};

const getRequiredPermissionForRequest = (req) => {
  if (req.originalUrl.startsWith('/api/auth/login')) return null;
  if (req.originalUrl.startsWith('/api/auth/change-password')) return null;
  if (req.originalUrl.startsWith('/api/auth/me')) return null;
  if (req.originalUrl.startsWith('/api/auth/profile')) {
    return req.method === 'GET' ? 'settings.view' : 'settings.update';
  }
  if (req.originalUrl.startsWith('/api/tenants')) return null;

  const [, apiSegment] = req.originalUrl.split('/').filter(Boolean);
  const moduleName = MODULE_PERMISSION_MAP[apiSegment];
  const action = getActionForRequest(req);

  if (!moduleName || !action) return null;
  if (req.originalUrl.startsWith('/api/roles')) {
    return action === 'view' ? 'roles.view' : 'roles.manage';
  }
  if (req.originalUrl.startsWith('/api/users')) {
    return action === 'view' ? 'users.view' : 'users.manage';
  }
  if (req.originalUrl.startsWith('/api/students') && /\/(assign-class|class-assignments)(\/|$)/i.test(req.originalUrl)) {
    return 'students.update';
  }
  if (req.originalUrl.startsWith('/api/teachers') && /\/increments(\/|$)/i.test(req.originalUrl)) {
    return req.method === 'GET' ? 'teachers.view' : 'teachers.update';
  }
  if (req.originalUrl.startsWith('/api/attendance')) {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') return 'attendance.mark';
    return action === 'view' ? 'attendance.view' : `attendance.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/student-fees')) {
    if (req.method === 'PATCH' && /\/payment(\/|$)/i.test(req.originalUrl)) return 'fees.create';
    return action === 'view' ? 'fees.view' : `fees.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance/reports')) return 'reports.view';
  if (req.originalUrl.startsWith('/api/finance/expenses')) {
    return action === 'view' ? 'fees.view' : `fees.${action}`;
  }
  if (req.originalUrl.startsWith('/api/finance')) {
    return action === 'view' ? 'fees.view' : `fees.${action}`;
  }
  if (req.originalUrl.startsWith('/api/financial')) {
    return action === 'view' ? 'fees.view' : `fees.${action}`;
  }
  if (moduleName === 'reports') return 'reports.view';
  if (moduleName === 'settings') {
    return action === 'view' ? 'settings.view' : 'settings.update';
  }
  if (moduleName === 'support' && action !== 'view') return 'support.create';
  if (moduleName === 'suggestions' && action !== 'view') return 'suggestions.create';

  return `${moduleName}.${action}`;
};

const assertAnyPermission = (auth, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (hasAnyPermission(auth, requiredPermissions)) return;

  throw new AppError('You do not have permission to perform this action.', 403);
};

const assertAllPermissions = (auth, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (hasAllPermissions(auth, requiredPermissions)) return;

  throw new AppError('You do not have permission to perform this action.', 403);
};

const enforceRoutePermission = (req) => {
  const requiredPermission = getRequiredPermissionForRequest(req);
  if (!requiredPermission) return;

  assertAnyPermission(req.auth, [requiredPermission]);
};

export const authorizationService = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  isTenantAdmin,
  assertAnyPermission,
  assertAllPermissions,
  enforceRoutePermission,
  getRequiredPermissionForRequest,
};
