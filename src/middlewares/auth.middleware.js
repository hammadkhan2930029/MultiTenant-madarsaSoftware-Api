import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../modules/auth/auth.service.js';
import { getAdminRoleAndPermissions } from '../modules/roles/roleAccess.service.js';

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const MODULE_PERMISSION_MAP = {
  branches: 'class_management',
  classes: 'class_management',
  sections: 'class_management',
  sessions: 'class_management',
  subjects: 'class_management',
  students: 'students',
  parents: 'parents',
  attendance: 'attendance',
  teachers: 'teachers',
  hifz: 'hifz',
  finance: 'finance',
  financial: 'finance',
  reports: 'reports',
  cities: 'settings',
  departments: 'settings',
  qualifications: 'settings',
  shifts: 'settings',
  schedules: 'class_management',
  'teacher-schedules': 'teachers',
  'exam-schedules': 'exams',
  'exam-results': 'exams',
  'result-grades': 'exams',
  store: 'store',
  suggestions: 'suggestions',
  support: 'support',
  roles: 'roles',
  users: 'users',
};

const getActionForRequest = (req) => {
  if (req.method === 'GET') return 'view';
  if (req.method === 'POST') return 'create';
  if (req.method === 'DELETE') return 'delete';
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return /\/(deactivate|delete|remove)(\/|$)/i.test(req.originalUrl) ? 'delete' : 'edit';
  }

  return null;
};

const getRequiredPermissionForRequest = (req) => {
  if (req.originalUrl.startsWith('/api/auth/')) return null;
  if (req.originalUrl.startsWith('/api/tenants')) return null;

  const [, apiSegment] = req.originalUrl.split('/').filter(Boolean);
  const moduleName = MODULE_PERMISSION_MAP[apiSegment];
  const action = getActionForRequest(req);

  if (!moduleName || !action) return null;
  if (moduleName === 'reports') return 'reports.view';
  if (moduleName === 'support' && action !== 'view') return 'support.create';
  if (moduleName === 'suggestions' && action !== 'view') return 'suggestions.create';

  return `${moduleName}.${action}`;
};

const TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES = ['roles.', 'tenant_management.', 'tenants.'];

const canTenantAdminBypass = (permission) => (
  permission && !TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES.some((prefix) => permission.startsWith(prefix))
);

const enforceRoutePermission = (req) => {
  const requiredPermission = getRequiredPermissionForRequest(req);
  if (!requiredPermission) return;

  if (req.auth?.isSuperAdmin || (req.auth?.isTenantAdmin && canTenantAdminBypass(requiredPermission))) return;

  const availablePermissions = new Set(req.auth?.permissionKeys || []);
  if (!availablePermissions.has(requiredPermission)) {
    throw new AppError('You do not have permission to perform this action.', 403);
  }
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

  const tokenTenantId = normalizeTenantId(decodedToken.tenantId);
  const requestTenantId = normalizeTenantId(req.tenantId);
  const isGlobalSuperAdminToken = decodedToken.role === 'super_admin' && tokenTenantId === null;

  if (isGlobalSuperAdminToken) {
    if (!req.tenantHost?.isSystemHost) {
      throw new AppError('Super admin token is not valid for this tenant domain.', 403);
    }
  } else if (tokenTenantId !== requestTenantId) {
    throw new AppError('Token tenant does not match the current request tenant.', 403);
  }

  const admin = await authService.getAuthenticatedAdminById(decodedToken.adminId);

  if (!admin) {
    throw new AppError('Admin account not found.', 401);
  }

  if (admin.status !== 'active') {
    throw new AppError('Your account is inactive. Please contact support.', 403);
  }

  const adminTenantId = normalizeTenantId(admin.tenantId || admin.tenant_id);

  if (isGlobalSuperAdminToken) {
    if (adminTenantId !== null) {
      throw new AppError('Super admin token is not valid for a tenant admin account.', 403);
    }
  } else if (adminTenantId !== requestTenantId) {
    throw new AppError('Admin account does not belong to the current request tenant.', 403);
  }

  const access = await getAdminRoleAndPermissions(admin);
  const roleName = access.role?.roleName || access.role?.role_name || admin.role;

  req.admin = admin;
  req.auth = {
    admin,
    role: access.role,
    permissions: access.permissions,
    permissionKeys: access.permissionKeys,
    roleName,
    isSuperAdmin: roleName === 'super_admin' && adminTenantId === null,
    isTenantAdmin: roleName === 'admin' && adminTenantId !== null,
    tenantId: adminTenantId,
  };

  enforceRoutePermission(req);
  next();
});
