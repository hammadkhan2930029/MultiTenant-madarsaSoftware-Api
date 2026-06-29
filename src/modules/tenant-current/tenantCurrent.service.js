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
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        status: 'active',
      },
      include: { profile: true },
    });

    if (!tenant) {
      throw new AppError('Tenant not found for this domain.', 404);
    }

    return mapCurrentTenantBranding(tenant);
  },
};
