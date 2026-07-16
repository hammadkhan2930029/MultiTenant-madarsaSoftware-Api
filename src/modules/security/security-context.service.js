import { AppError } from '../../utils/appError.js';

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const getRoleName = (access, admin) => access.role?.roleName || access.role?.role_name || admin.role;

const assertTokenTenantMatch = ({ decodedToken, requestTenantId, isSystemHost }) => {
  const tokenTenantId = normalizeTenantId(decodedToken.tenantId);
  const resolvedRequestTenantId = normalizeTenantId(requestTenantId);
  const isGlobalSuperAdminToken = decodedToken.role === 'super_admin' && tokenTenantId === null;

  if (isGlobalSuperAdminToken) {
    if (!isSystemHost) {
      throw new AppError('Super admin token is not valid for this tenant domain.', 403);
    }

    return { tokenTenantId, isGlobalSuperAdminToken };
  }

  if (tokenTenantId !== resolvedRequestTenantId) {
    throw new AppError('Token tenant does not match the current request tenant.', 403);
  }

  return { tokenTenantId, isGlobalSuperAdminToken };
};

const assertAdminTenantMatch = ({ admin, requestTenantId, isGlobalSuperAdminToken }) => {
  const adminTenantId = normalizeTenantId(admin.tenantId || admin.tenant_id);
  const resolvedRequestTenantId = normalizeTenantId(requestTenantId);

  if (isGlobalSuperAdminToken) {
    if (adminTenantId !== null) {
      throw new AppError('Super admin token is not valid for a tenant admin account.', 403);
    }

    return adminTenantId;
  }

  if (adminTenantId !== resolvedRequestTenantId) {
    throw new AppError('Admin account does not belong to the current request tenant.', 403);
  }

  return adminTenantId;
};

const assertRoleTenantMatch = ({ access, tenantId, isSuperAdmin }) => {
  if (!access.role?.id) {
    throw new AppError('Assigned role is not valid.', 403);
  }

  if (access.role?.status && access.role.status !== 'active') {
    throw new AppError('Assigned role is inactive.', 403);
  }

  if (isSuperAdmin) return;

  const roleTenantId = normalizeTenantId(access.role?.tenantId ?? access.role?.tenant_id);
  const resolvedTenantId = normalizeTenantId(tenantId);

  if (roleTenantId !== resolvedTenantId) {
    throw new AppError('Assigned role is not valid for this tenant.', 403);
  }
};

const buildAuthContext = ({ admin, access, tenantId }) => {
  const roleName = getRoleName(access, admin);
  const resolvedTenantId = normalizeTenantId(tenantId);
  const branchId = admin.branchId || admin.branch_id || null;

  const auth = {
    admin,
    role: access.role,
    permissions: access.permissions,
    permissionKeys: access.permissionKeys,
    roleName,
    isSuperAdmin: roleName === 'super_admin' && resolvedTenantId === null,
    isTenantAdmin: roleName === 'admin' && resolvedTenantId !== null && !branchId,
    tenantId: resolvedTenantId,
    branchId,
  };

  assertRoleTenantMatch({
    access,
    tenantId: resolvedTenantId,
    isSuperAdmin: auth.isSuperAdmin,
  });

  return auth;
};

const buildSecurityContext = ({ req, decodedToken, admin, auth }) => ({
  tenant: {
    id: auth.tenantId,
    resolvedFromHost: req.tenantHost || null,
    entity: req.tenant || null,
  },
  token: {
    adminId: decodedToken.adminId,
    tenantId: normalizeTenantId(decodedToken.tenantId),
    branchId: normalizeTenantId(decodedToken.branchId),
    role: decodedToken.role,
  },
  actor: {
    id: admin.id,
    tenantId: auth.tenantId,
    branchId: auth.branchId,
    roleId: auth.role?.id || null,
    roleName: auth.roleName,
    isSuperAdmin: auth.isSuperAdmin,
    isTenantAdmin: auth.isTenantAdmin,
  },
  authorization: {
    permissionKeys: auth.permissionKeys,
    source: 'role',
  },
  scopes: {
    branchIds: auth.branchId ? [auth.branchId] : [],
    departmentIds: [],
  },
  featureFlags: {},
  subscription: {
    status: 'not_configured',
    plan: null,
  },
});

export const securityContextService = {
  normalizeTenantId,
  assertTokenTenantMatch,
  assertAdminTenantMatch,
  assertRoleTenantMatch,
  buildAuthContext,
  buildSecurityContext,
};
