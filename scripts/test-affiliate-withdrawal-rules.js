import { Prisma } from '../src/generated/prisma/index.js';
import { prisma } from '../src/config/prisma.js';
import { createWithdrawalRequestInTransaction } from '../src/modules/affiliate/wallet/affiliateWallet.service.js';

const marker = `AFFILIATE_WITHDRAWAL_ROLLBACK_${Date.now()}`;
const counts = () => Promise.all([
  prisma.tenant.count(), prisma.affiliateCommission.count(), prisma.affiliatePaymentAccount.count(),
  prisma.affiliateWithdrawalRequest.count(), prisma.auditLog.count(),
]);
const before = await counts();
const checks = [];
let failure = null;
const check = (condition, name, detail = '') => checks.push({ name, passed: Boolean(condition), ...(condition || !detail ? {} : { detail }) });
const expectStatus = async (callback, statusCode, name) => {
  try { await callback(); check(false, name, 'request unexpectedly succeeded'); } catch (error) { check(error.statusCode === statusCode, name, `expected=${statusCode} actual=${error.statusCode} message=${error.message}`); }
};

try {
  await prisma.$transaction(async (tx) => {
    await tx.affiliateSetting.upsert({ where: { scopeKey: 'global' }, create: { scopeKey: 'global', status: 'active', withdrawalIntervalDays: 0, allowBlankWithdrawalAmount: true, allowOnlyOnePendingRequest: true, minimumWithdrawalAmount: new Prisma.Decimal('100.00') }, update: { status: 'active', withdrawalIntervalDays: 0, allowBlankWithdrawalAmount: true, allowOnlyOnePendingRequest: true, minimumWithdrawalAmount: new Prisma.Decimal('100.00') } });
    const suffix = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const referrer = await tx.tenant.create({ data: { tenantCode: `aw_ref_${suffix}`, name: 'Withdrawal rollback referrer', referralCode: `AWR${suffix}`.slice(0, 20), status: 'active' } });
    const referred = await tx.tenant.create({ data: { tenantCode: `aw_new_${suffix}`, name: 'Withdrawal rollback referred', referralCode: `AWN${suffix}`.slice(0, 20), referredByTenantId: referrer.id, referredAt: new Date(), saleAmount: new Prisma.Decimal('100000.00'), saleCurrency: 'PKR', status: 'active' } });
    await tx.affiliateCommission.create({ data: { referrerTenantId: referrer.id, referredTenantId: referred.id, referralCountSnapshot: 1, saleAmountSnapshot: new Prisma.Decimal('100000.00'), percentageSnapshot: new Prisma.Decimal('10.00'), commissionAmount: new Prisma.Decimal('10000.00'), currency: 'PKR', status: 'earned', earnedAt: new Date() } });
    const account = await tx.affiliatePaymentAccount.create({ data: { tenantId: referrer.id, accountType: 'bank', accountTitle: 'Rollback Test Account', accountNumber: 'TEST-ONLY', isDefault: true, status: 'active' } });
    const context = { tenantId: referrer.id, adminId: null, audit: {} };
    const request = await createWithdrawalRequestInTransaction(tx, context, { paymentAccountId: account.id, currency: 'PKR', amount: null, requestNote: 'rollback test' });
    check(request.requestedAmount === '10000.00', 'Blank amount requests the full available balance', request.requestedAmount);
    check(request.status === 'pending', 'New withdrawal starts as pending', request.status);
    check(request.paymentAccountSnapshot?.accountNumber === 'TEST-ONLY', 'Payment account snapshot is preserved');

    await expectStatus(() => createWithdrawalRequestInTransaction(tx, context, { paymentAccountId: account.id, currency: 'PKR', amount: 1000 }), 409, 'Single-pending-request rule is enforced');
    await tx.affiliateWithdrawalRequest.update({ where: { id: request.id }, data: { status: 'rejected' } });
    await expectStatus(() => createWithdrawalRequestInTransaction(tx, context, { paymentAccountId: account.id, currency: 'PKR', amount: 50 }), 422, 'Minimum withdrawal amount is enforced');
    await expectStatus(() => createWithdrawalRequestInTransaction(tx, context, { paymentAccountId: account.id, currency: 'PKR', amount: 10001 }), 422, 'Available balance cannot be exceeded');
    await tx.affiliateSetting.update({ where: { scopeKey: 'global' }, data: { allowBlankWithdrawalAmount: false } });
    await expectStatus(() => createWithdrawalRequestInTransaction(tx, context, { paymentAccountId: account.id, currency: 'PKR', amount: null }), 422, 'Blank amount can be disabled by Super Admin settings');
    throw new Error(marker);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 });
} catch (error) { if (error.message !== marker) failure = error.message; }

const after = await counts();
check(before.every((count, index) => count === after[index]), 'Rollback leaves all tested record counts unchanged', `before=${before.join(',')} after=${after.join(',')}`);
const failed = checks.filter((row) => !row.passed);
if (!failure && failed.length) failure = `${failed.length} withdrawal rule check(s) failed.`;
console.log(JSON.stringify({ success: !failure, summary: { checks: checks.length, passed: checks.filter((row) => row.passed).length, failed: failed.length }, rollback: { before: before.join(','), after: after.join(','), unchanged: before.every((count, index) => count === after[index]) }, checks, ...(failure ? { failure } : {}) }, null, 2));
await prisma.$disconnect();
if (failure) process.exitCode = 1;
