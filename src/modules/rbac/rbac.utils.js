import { TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES } from './rbac.constants.js';

const GRANTED_PERMISSION_ALIASES = {
  'admissions.create': ['students.create'],
  'admissions.edit': ['students.edit', 'students.update'],
  'admissions.update': ['students.edit', 'students.update'],
};

export const normalizePermissions = (permissions = []) => (
  Array.isArray(permissions) ? permissions.flat().filter(Boolean) : [permissions].filter(Boolean)
);

export const getPermissionKeys = (auth = {}) => {
  const assignedPermissions = normalizePermissions(
    auth.permissionKeys ||
      auth.permissions?.map?.((permission) => (
        typeof permission === 'string' ? permission : permission?.permissionKey
      ))
  );

  return Array.from(new Set(assignedPermissions.flatMap((permission) => [
    permission,
    ...(GRANTED_PERMISSION_ALIASES[permission] || []),
  ])));
};

export const isSuperAdmin = (auth = {}) => Boolean(auth?.isSuperAdmin);

export const isTenantAdmin = (auth = {}) => Boolean(auth?.isTenantAdmin);

export const canTenantAdminBypass = (permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);

  return requiredPermissions.length > 0 && !requiredPermissions.some((permission) =>
    TENANT_ADMIN_BYPASS_BLOCKED_PREFIXES.some((prefix) => permission.startsWith(prefix))
  );
};

export const hasPermission = (auth = {}, permission) => {
  if (!permission) return false;
  if (isSuperAdmin(auth)) return true;
  if (isTenantAdmin(auth) && canTenantAdminBypass([permission])) return true;

  return new Set(getPermissionKeys(auth)).has(permission);
};

export const hasAnyPermission = (auth = {}, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (!requiredPermissions.length) return false;
  if (isSuperAdmin(auth)) return true;
  if (isTenantAdmin(auth) && canTenantAdminBypass(requiredPermissions)) return true;

  const availablePermissions = new Set(getPermissionKeys(auth));
  return requiredPermissions.some((permission) => availablePermissions.has(permission));
};

export const hasAllPermissions = (auth = {}, permissions = []) => {
  const requiredPermissions = normalizePermissions(permissions);
  if (!requiredPermissions.length) return false;
  if (isSuperAdmin(auth)) return true;
  if (isTenantAdmin(auth) && canTenantAdminBypass(requiredPermissions)) return true;

  const availablePermissions = new Set(getPermissionKeys(auth));
  return requiredPermissions.every((permission) => availablePermissions.has(permission));
};
