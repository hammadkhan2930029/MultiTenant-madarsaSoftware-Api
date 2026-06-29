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

  if (hostContext.source === 'system') {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantCode: env.defaultTenantCode },
    });

    return { tenant, ...hostContext };
  }

  if (hostContext.source === 'subdomain') {
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: hostContext.subdomain },
    });

    return { tenant, ...hostContext };
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      customDomain: hostname,
    },
  });

  return { tenant, ...hostContext };
};

export const tenantResolverMiddleware = asyncHandler(async (req, _res, next) => {
  const hostname = normalizeHostname(req.hostname);
  const { tenant, source, subdomain, baseDomain } = await findTenantByHostname(hostname);

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
    isSystemHost: source === 'system',
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
