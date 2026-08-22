import { Prisma } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/prisma.js';
import { auditService } from '../../security/index.js';

const dateOnlyEnd = (value) => { const date = new Date(value); date.setUTCHours(23, 59, 59, 999); return date; };
const calculate = (sale, percentage) => new Prisma.Decimal(sale).mul(new Prisma.Decimal(percentage)).div(100).toDecimalPlaces(2);
const targets = (client) => client.tenant.findMany({
  where: { referredByTenantId: { not: null } },
  include: { affiliateCommissionsGenerated: true },
  orderBy: [{ referredAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
});
const tiers = (client) => client.affiliateCommissionTier.findMany({ where: { status: 'active' }, orderBy: [{ minReferrals: 'asc' }, { effectiveFrom: 'asc' }] });
const tierFor = (allTiers, count, at) => allTiers.find((tier) => tier.minReferrals <= count && (tier.maxReferrals === null || tier.maxReferrals >= count) && tier.effectiveFrom <= at && (!tier.effectiveTo || dateOnlyEnd(tier.effectiveTo) >= at));

const buildPlan = async (client) => {
  const [rows, allTiers, settings] = await Promise.all([targets(client), tiers(client), client.affiliateSetting.findUnique({ where: { scopeKey: 'global' } })]);
  const counts = new Map();
  const plan = [];
  for (const tenant of rows) {
    const currentCount = counts.get(tenant.referredByTenantId) || 0;
    const referralCount = tenant.status === 'active' ? currentCount + 1 : currentCount;
    if (tenant.status === 'active') counts.set(tenant.referredByTenantId, referralCount);
    const existing = tenant.affiliateCommissionsGenerated[0] || null;
    if (existing?.status && existing.status !== 'pending_calculation') { plan.push({ action: 'unchanged', tenant, existing, referralCount }); continue; }
    const at = new Date(tenant.referredAt || tenant.createdAt);
    const tier = tierFor(allTiers, referralCount, at);
    if ((!tier && !existing?.percentageSnapshot) || (settings?.status === 'inactive' && !existing)) { plan.push({ action: 'no_tier', tenant, existing, referralCount }); continue; }
    const percentage = existing?.percentageSnapshot || tier?.percentage;
    const sale = existing?.saleAmountSnapshot || tenant.saleAmount;
    const currency = existing?.currency || tenant.saleCurrency;
    const canEarn = tenant.status === 'active' && sale && currency && percentage;
    plan.push({ action: existing ? 'update_pending' : 'create', tenant, existing, referralCount, tier, percentage, sale, currency, canEarn });
  }
  return plan;
};
const summary = (plan) => ({
  totalReferrals: plan.length,
  missingRecords: plan.filter((row) => row.action === 'create').length,
  pendingEligible: plan.filter((row) => row.action === 'update_pending').length,
  withoutApplicableTier: plan.filter((row) => row.action === 'no_tier').length,
  protectedHistoricalRecords: plan.filter((row) => row.action === 'unchanged').length,
  willEarn: plan.filter((row) => ['create', 'update_pending'].includes(row.action) && row.canEarn).length,
});

export const commissionReconciliationService = {
  async preview() { return summary(await buildPlan(prisma)); },
  async run(context) {
    return prisma.$transaction(async (tx) => {
      const plan = await buildPlan(tx);
      let created = 0; let updated = 0; let earned = 0;
      for (const row of plan) {
        if (!['create', 'update_pending'].includes(row.action)) continue;
        const data = {
          commissionTierId: row.existing?.commissionTierId || row.tier?.id || null,
          referralCountSnapshot: row.existing?.referralCountSnapshot || row.referralCount,
          saleAmountSnapshot: row.sale || null, percentageSnapshot: row.percentage,
          commissionAmount: row.canEarn ? calculate(row.sale, row.percentage) : null,
          currency: row.currency || null, status: row.canEarn ? 'earned' : 'pending_calculation',
          earnedAt: row.canEarn ? (row.existing?.earnedAt || new Date()) : null,
        };
        if (row.action === 'create') {
          await tx.affiliateCommission.create({ data: { referrerTenantId: row.tenant.referredByTenantId, referredTenantId: row.tenant.id, ...data } }); created += 1;
        } else { await tx.affiliateCommission.update({ where: { id: row.existing.id }, data }); updated += 1; }
        if (row.canEarn) earned += 1;
      }
      const result = { ...summary(plan), created, updated, earned };
      await auditService.recordAuditLog(tx, { tenantId: null, actorUserId: context.adminId, branchId: null, roleId: context.audit?.roleId || null, action: 'affiliate.commissions.reconciled', module: 'affiliate', targetType: 'affiliate_commission', targetId: null, newValue: result, ipAddress: context.audit?.ipAddress || null, userAgent: context.audit?.userAgent || null });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
