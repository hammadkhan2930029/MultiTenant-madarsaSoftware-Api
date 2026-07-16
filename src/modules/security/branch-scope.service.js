import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';

const BRANCH_SCOPED_METHODS = ['POST', 'PUT', 'PATCH'];

const isEmptyValue = (value) => value === null || value === undefined || value === '';

const normalizePositiveId = (value, label = 'scope') => {
  if (isEmptyValue(value)) return null;

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new AppError('برانچ یا ادارے کی معلومات درست نہیں ہیں۔', 403);
  }

  return normalized;
};

const getContextFromRequest = (req = {}) => ({
  tenantId: normalizePositiveId(req.auth?.tenantId ?? req.tenantId, 'tenant scope'),
  auth: req.auth || {},
  security: req.security || {},
});

const isBranchScopedUser = (auth = {}) => Boolean(
  auth.branchId && !auth.isTenantAdmin && !auth.isSuperAdmin,
);

const getRequestedBranchId = (req = {}) => {
  const queryBranchId = normalizePositiveId(req.query?.branchId, 'branch scope');
  const bodyBranchId = normalizePositiveId(req.body?.branchId, 'branch scope');

  if (queryBranchId && bodyBranchId && queryBranchId !== bodyBranchId) {
    throw new AppError('آپ کو اس برانچ تک رسائی حاصل نہیں ہے۔', 403);
  }

  return queryBranchId || bodyBranchId;
};

const getAllowedBranchIds = (security = {}, auth = {}) => {
  const scopeBranchIds = security.scopes?.branchIds || [];
  if (scopeBranchIds.length) {
    return scopeBranchIds.map((branchId) => normalizePositiveId(branchId, 'branch scope'));
  }

  const authBranchId = normalizePositiveId(auth.branchId, 'branch scope');
  return authBranchId ? [authBranchId] : [];
};

const buildTenantScope = (reqOrContext = {}) => {
  const tenantId = normalizePositiveId(
    reqOrContext.tenantId ?? reqOrContext.auth?.tenantId ?? reqOrContext.req?.auth?.tenantId ?? reqOrContext.req?.tenantId,
    'tenant scope',
  );

  if (!tenantId) {
    throw new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔ دوبارہ لاگ اِن کریں۔', 403);
  }

  return {
    tenantId,
    where: { tenantId },
  };
};

const buildBranchScope = (reqOrContext = {}, options = {}) => {
  const req = reqOrContext.req || reqOrContext;
  const { auth, security, tenantId } = getContextFromRequest(req);
  const resolvedBranchId = normalizePositiveId(auth.branchId, 'branch scope');
  const requestedBranchId = getRequestedBranchId(req);
  const branchIds = getAllowedBranchIds(security, auth);
  const branchScoped = isBranchScopedUser(auth);
  const branchId = requestedBranchId || resolvedBranchId;

  if (options.requireTenant !== false && !tenantId && !auth.isSuperAdmin) {
    throw new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔ دوبارہ لاگ اِن کریں۔', 403);
  }

  if ((options.required || branchScoped) && !branchId) {
    throw new AppError('برانچ کی معلومات دستیاب نہیں ہیں۔', 403);
  }

  return {
    tenantId,
    branchId,
    requestedBranchId,
    resolvedBranchId,
    branchIds,
    isBranchScoped: branchScoped,
    where: {
      ...(tenantId ? { tenantId } : {}),
      ...(branchId ? { branchId } : {}),
    },
  };
};

const assertBranchIdInScope = (branchId, branchScope) => {
  if (!branchId || !branchScope.branchIds.length) return;

  if (!branchScope.branchIds.includes(branchId)) {
    throw new AppError('آپ کو اس برانچ تک رسائی حاصل نہیں ہے۔', 403);
  }
};

const requireBranchAccess = (req, branchId, options = {}) => {
  const branchScope = buildBranchScope(req, options);
  const requestedBranchId = normalizePositiveId(branchId ?? branchScope.requestedBranchId, 'branch scope');

  if (requestedBranchId) {
    assertBranchIdInScope(requestedBranchId, branchScope);
  }

  if (branchScope.isBranchScoped && requestedBranchId && requestedBranchId !== branchScope.resolvedBranchId) {
    throw new AppError('آپ کو اس برانچ تک رسائی حاصل نہیں ہے۔', 403);
  }

  return {
    ...branchScope,
    branchId: requestedBranchId || branchScope.branchId,
  };
};

const validateBranchBelongsToTenant = async ({
  tenantId,
  branchId,
  requireActive = false,
  client = prisma,
} = {}) => {
  const resolvedTenantId = normalizePositiveId(tenantId, 'tenant scope');
  const resolvedBranchId = normalizePositiveId(branchId, 'branch scope');

  if (!resolvedTenantId || !resolvedBranchId) {
    throw new AppError('آپ کو اس برانچ تک رسائی حاصل نہیں ہے۔', 403);
  }

  const branch = await client.branch.findFirst({
    where: {
      id: resolvedBranchId,
      tenantId: resolvedTenantId,
    },
    select: {
      id: true,
      tenantId: true,
      status: true,
    },
  });

  if (!branch) {
    throw new AppError('آپ کو اس برانچ تک رسائی حاصل نہیں ہے۔', 403);
  }

  if (requireActive && branch.status !== 'active') {
    throw new AppError('منتخب برانچ غیر فعال ہے یا دستیاب نہیں۔ ایڈمن سے رابطہ کریں۔', 403);
  }

  return branch;
};

const applyBranchScopeToRequest = (req) => {
  const branchScope = requireBranchAccess(req, undefined, {
    required: isBranchScopedUser(req.auth),
  });

  req.branchScope = branchScope;
  req.resolvedBranchId = branchScope.branchId || null;

  if (!branchScope.isBranchScoped) return;

  if (req.method === 'GET') {
    req.query = {
      ...(req.query || {}),
      branchId: String(branchScope.resolvedBranchId),
    };
    return;
  }

  if (BRANCH_SCOPED_METHODS.includes(req.method) && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = {
      ...req.body,
      branchId: branchScope.resolvedBranchId,
    };
  }
};

export const branchScopeService = {
  normalizePositiveId,
  buildTenantScope,
  buildBranchScope,
  requireBranchAccess,
  validateBranchBelongsToTenant,
  applyBranchScopeToRequest,
};
