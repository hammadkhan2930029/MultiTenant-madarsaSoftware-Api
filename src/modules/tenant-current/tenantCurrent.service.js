import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';

const mapCurrentTenantBranding = (tenant) => {
  const profile = tenant?.profile?.status === 'active' ? tenant.profile : null;
  const displayName = profile?.name || tenant?.name || '';

  return {
    tenant: {
      id: tenant.id,
      tenantCode: tenant.tenantCode,
      name: tenant.name,
      subdomain: tenant.subdomain,
      customDomain: tenant.customDomain,
      status: tenant.status,
    },
    madrassa: profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone1: profile.phone1,
          phone2: profile.phone2,
          address: profile.address,
          branch: profile.branch,
          city: profile.city,
          logoUrl: profile.logoUrl,
          status: profile.status,
        }
      : null,
    branding: {
      name: displayName,
      logoUrl: profile?.logoUrl || null,
      theme: {},
      settings: {},
    },
  };
};

export const tenantCurrentService = {
  async getCurrentTenantBranding(tenantId) {
    if (!tenantId) {
      throw new AppError('Tenant could not be resolved for this request.', 400);
    }

    let tenant;

    try {
      tenant = await prisma.tenant.findFirst({
        where: {
          id: tenantId,
          status: 'active',
        },
        include: { profile: true },
      });
    } catch (error) {
      console.error('[tenant/current] database query error', {
        tenantId,
        message: error.message,
        code: error.code,
      });
      throw new AppError('Unable to fetch current tenant branding.', 500);
    }

    if (!tenant) {
      throw new AppError('Tenant not found for this domain.', 404);
    }

    return mapCurrentTenantBranding(tenant);
  },
};
