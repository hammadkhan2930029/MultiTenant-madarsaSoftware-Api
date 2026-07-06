import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeDomainName } from '../utils/domain.js';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const stripPort = (hostname) => {
  if (!hostname || hostname.includes('::')) return hostname;
  return hostname.replace(/:\d+$/, '');
};

const normalizeHostname = (hostname = '') =>
  stripPort(normalizeDomainName(hostname));

const isLocalHost = (hostname) => LOCAL_HOSTS.has(hostname);

const isSystemHost = (hostname) => (
  isLocalHost(hostname) || env.tenantSystemHosts.includes(hostname)
);

const isSystemSubdomain = (subdomain) => env.tenantSystemSubdomains.includes(subdomain);

const isTenantCurrentRequest = (req) => req.originalUrl?.startsWith('/api/tenant/current');

const logTenantCurrentDebug = (req, payload = {}) => {
  if (!isTenantCurrentRequest(req)) return;

  console.info('[tenant/current]', {
    hostname: req.hostname,
    origin: req.headers.origin || null,
    appOrigin: env.appOrigin,
    ...payload,
  });
};

const resolveHostContext = (hostname) => {
  if (isSystemHost(hostname)) {
    return { source: 'system', subdomain: null, baseDomain: null };
  }

  for (const baseDomain of env.tenantBaseDomains) {
    if (hostname === baseDomain) {
      return { source: 'system', subdomain: null, baseDomain };
    }

    const suffix = `.${baseDomain}`;
    if (!hostname.endsWith(suffix)) {
      continue;
    }

    const subdomain = hostname.slice(0, -suffix.length);
    if (!subdomain || subdomain.includes('.')) {
      return { source: 'custom-domain', subdomain: null, baseDomain: null };
    }

    if (isSystemSubdomain(subdomain)) {
      return { source: 'system', subdomain, baseDomain };
    }

    return { source: 'subdomain', subdomain, baseDomain };
  }

  return { source: 'custom-domain', subdomain: null, baseDomain: null };
};

const findTenantByHostname = async (hostname) => {
  if (!hostname) {
    throw new AppError('Tenant host is required.', 400);
  }

  const hostContext = resolveHostContext(hostname);
  let tenant = null;

  if (hostContext.source === 'system') {
    tenant = await prisma.tenant.findUnique({
      where: { tenantCode: env.defaultTenantCode },
    });

    return { tenant, ...hostContext };
  }

  if (hostContext.source === 'subdomain') {
    tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: hostContext.subdomain },
          { tenantCode: hostContext.subdomain },
        ],
      },
    });

    if (tenant) {
      return { tenant, ...hostContext };
    }
  } else {
    tenant = await prisma.tenant.findFirst({
      where: {
        customDomain: hostname,
      },
    });

    if (tenant) {
      return { tenant, ...hostContext };
    }
  }

  const defaultTenant = await prisma.tenant.findUnique({
    where: { tenantCode: env.defaultTenantCode },
  });

  return {
    tenant: defaultTenant,
    ...hostContext,
    fallbackToDefault: Boolean(defaultTenant),
  };
};

export const tenantResolverMiddleware = asyncHandler(async (req, _res, next) => {
  const hostname = normalizeHostname(req.hostname);
  let result;

  try {
    result = await findTenantByHostname(hostname);
  } catch (error) {
    logTenantCurrentDebug(req, {
      resolvedTenantCode: null,
      databaseQueryError: error.message,
    });
    throw error;
  }

  const { tenant, source, subdomain, baseDomain, fallbackToDefault = false } = result;

  logTenantCurrentDebug(req, {
    resolvedTenantCode: tenant?.tenantCode || null,
    hostSource: source,
    subdomain: subdomain || null,
    fallbackToDefault,
  });

  if (!tenant) {
    const message = source === 'subdomain'
      ? 'Tenant not found for this subdomain.'
      : 'Tenant not found for this domain.';
    throw new AppError(message, 404);
  }

  if (tenant.status !== 'active') {
    throw new AppError('Tenant is inactive. Please contact support.', 403);
  }

  req.tenant = tenant;
  req.tenantId = tenant.id;
  req.tenantHost = {
    hostname,
    source,
    subdomain: subdomain || null,
    baseDomain: baseDomain || null,
    isSystemHost: source === 'system' || fallbackToDefault,
    fallbackToDefault,
  };
  next();
});

export const tenantResolverUtils = {
  normalizeHostname,
  resolveHostContext,
  resolveSubdomain: (hostname) => {
    const context = resolveHostContext(normalizeHostname(hostname));
    return context.source === 'subdomain' ? context.subdomain : null;
  },
};
