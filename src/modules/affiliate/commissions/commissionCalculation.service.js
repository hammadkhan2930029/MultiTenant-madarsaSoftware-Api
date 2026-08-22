import { Prisma } from '../../../generated/prisma/index.js';

const GLOBAL_SCOPE_KEY = 'global';

const calculateCommissionAmount = (saleAmount, percentage) => (
  new Prisma.Decimal(saleAmount).mul(new Prisma.Decimal(percentage)).div(100).toDecimalPlaces(2)
);

const getApplicableTier = (client, referralCount, calculationDate) => client.affiliateCommissionTier.findFirst({
  where: {
    status: 'active',
    minReferrals: { lte: referralCount },
    OR: [{ maxReferrals: null }, { maxReferrals: { gte: referralCount } }],
    effectiveFrom: { lte: calculationDate },
    AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: calculationDate } }] }],
  },
  orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
});

export const affiliateCommissionCalculationService = {
  async createForNewReferral(client, { tenant, referrer }) {
    if (!referrer) return null;

    const settings = await client.affiliateSetting.findUnique({ where: { scopeKey: GLOBAL_SCOPE_KEY } });
    if (settings?.status === 'inactive') return null;

    const earnedAt = new Date();
    const calculationDate = new Date(Date.UTC(earnedAt.getUTCFullYear(), earnedAt.getUTCMonth(), earnedAt.getUTCDate()));
    const referralCount = await client.tenant.count({
      where: { referredByTenantId: referrer.id, status: 'active' },
    });
    const tier = referralCount > 0 ? await getApplicableTier(client, referralCount, calculationDate) : null;
    const canEarn = Boolean(tenant.status === 'active' && tenant.saleAmount && tenant.saleCurrency && tier);
    const commissionAmount = canEarn
      ? calculateCommissionAmount(tenant.saleAmount, tier.percentage)
      : null;

    return client.affiliateCommission.create({
      data: {
        referrerTenantId: referrer.id,
        referredTenantId: tenant.id,
        commissionTierId: tier?.id || null,
        referralCountSnapshot: referralCount,
        saleAmountSnapshot: tenant.saleAmount || null,
        percentageSnapshot: tier?.percentage || null,
        commissionAmount,
        currency: tenant.saleCurrency || null,
        status: canEarn ? 'earned' : 'pending_calculation',
        earnedAt: canEarn ? earnedAt : null,
      },
    });
  },

  async getByReferredTenant(client, tenantId) {
    return client.affiliateCommission.findUnique({ where: { referredTenantId: tenantId } });
  },

  async syncPendingSale(client, commission, saleAmount, saleCurrency, tenantStatus) {
    if (!commission || commission.status !== 'pending_calculation') return commission;

    const canEarn = Boolean(tenantStatus === 'active' && saleAmount && saleCurrency && commission.percentageSnapshot);
    return client.affiliateCommission.update({
      where: { id: commission.id },
      data: {
        saleAmountSnapshot: saleAmount || null,
        currency: saleCurrency || null,
        commissionAmount: canEarn
          ? calculateCommissionAmount(saleAmount, commission.percentageSnapshot)
          : null,
        status: canEarn ? 'earned' : 'pending_calculation',
        earnedAt: canEarn ? new Date() : null,
      },
    });
  },
};
