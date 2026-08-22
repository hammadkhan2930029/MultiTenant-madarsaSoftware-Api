import { Prisma } from '../src/generated/prisma/index.js';
import { prisma } from '../src/config/prisma.js';
import { affiliateCommissionCalculationService } from '../src/modules/affiliate/commissions/commissionCalculation.service.js';

const rollbackMarker = `AFFILIATE_TEST_ROLLBACK_${Date.now()}`;
const before = await Promise.all([prisma.tenant.count(), prisma.affiliateCommissionTier.count(), prisma.affiliateCommission.count()]);
const checks = [];
let failure = null;
const check = (condition, name, detail = '') => checks.push({ name, passed: Boolean(condition), ...(condition || !detail ? {} : { detail }) });

try {
  await prisma.$transaction(async (tx) => {
    await tx.affiliateSetting.upsert({
      where: { scopeKey: 'global' },
      create: { scopeKey: 'global', status: 'active' },
      update: { status: 'active' },
    });
    const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const referrer = await tx.tenant.create({ data: { tenantCode: `aff_test_ref_${suffix}`, name: 'Affiliate rollback test referrer', referralCode: `ATR${suffix}`.slice(0, 20), status: 'active' } });
    const referred = await tx.tenant.create({ data: { tenantCode: `aff_test_new_${suffix}`, name: 'Affiliate rollback test referred', referralCode: `ATN${suffix}`.slice(0, 20), referredByTenantId: referrer.id, referredAt: new Date(), status: 'active' } });
    const tier = await tx.affiliateCommissionTier.create({ data: { minReferrals: 1, maxReferrals: 1, percentage: new Prisma.Decimal('7.50'), effectiveFrom: new Date(), status: 'active' } });
    const pending = await affiliateCommissionCalculationService.createForNewReferral(tx, { tenant: referred, referrer });
    check(pending?.status === 'pending_calculation', 'Missing sale creates pending commission', pending?.status);
    check(pending?.percentageSnapshot?.toFixed(2) === '7.50', 'Current tier percentage is snapshotted', pending?.percentageSnapshot?.toFixed(2));
    check(pending?.referralCountSnapshot === 1, 'First referral count snapshot is 1', String(pending?.referralCountSnapshot));

    await tx.affiliateCommissionTier.update({ where: { id: tier.id }, data: { percentage: new Prisma.Decimal('20.00') } });
    const earned = await affiliateCommissionCalculationService.syncPendingSale(tx, pending, new Prisma.Decimal('100000.00'), 'PKR', 'active');
    check(earned.status === 'earned', 'Pending commission becomes earned after sale is supplied', earned.status);
    check(earned.percentageSnapshot?.toFixed(2) === '7.50', 'Tier edit does not change historical percentage snapshot', earned.percentageSnapshot?.toFixed(2));
    check(earned.commissionAmount?.toFixed(2) === '7500.00', 'Model-A commission calculation is correct', earned.commissionAmount?.toFixed(2));
    check(earned.currency === 'PKR', 'Commission currency snapshot is preserved', earned.currency);
    throw new Error(rollbackMarker);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
} catch (error) {
  if (error.message !== rollbackMarker) failure = error.message;
}

const after = await Promise.all([prisma.tenant.count(), prisma.affiliateCommissionTier.count(), prisma.affiliateCommission.count()]);
check(before.every((count, index) => count === after[index]), 'Rollback leaves tenant, tier and commission counts unchanged', `before=${before.join(',')} after=${after.join(',')}`);
const failed = checks.filter((row) => !row.passed);
if (!failure && failed.length) failure = `${failed.length} commission model check(s) failed.`;
console.log(JSON.stringify({ success: !failure, summary: { checks: checks.length, passed: checks.filter((row) => row.passed).length, failed: failed.length }, rollback: { before: before.join(','), after: after.join(','), unchanged: before.every((count, index) => count === after[index]) }, checks, ...(failure ? { failure } : {}) }, null, 2));
await prisma.$disconnect();
if (failure) process.exitCode = 1;
