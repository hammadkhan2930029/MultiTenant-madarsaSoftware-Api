import { prisma } from '../src/config/prisma.js';
import { createWithdrawalRequestSchema } from '../src/modules/affiliate/wallet/affiliateWallet.validation.js';
import { payAffiliateWithdrawalSchema } from '../src/modules/affiliate/withdrawals/affiliateWithdrawals.validation.js';
import { commissionReconciliationService } from '../src/modules/affiliate/commissions/commissionReconciliation.service.js';

const failures = [];
const checks = [];
const check = (condition, name, detail = '') => {
  checks.push({ name, passed: Boolean(condition) });
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
};

const duplicateIds = (rows, key) => {
  const seen = new Set(); const duplicates = new Set();
  rows.forEach((row) => { const value = row[key]; if (seen.has(value)) duplicates.add(value); seen.add(value); });
  return duplicates;
};

try {
  const [tenants, commissions, withdrawals, payments, accounts, reconciliation] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true, referredByTenantId: true } }),
    prisma.affiliateCommission.findMany({ select: { id: true, referrerTenantId: true, referredTenantId: true, commissionAmount: true, currency: true, status: true } }),
    prisma.affiliateWithdrawalRequest.findMany({ select: { id: true, tenantId: true, requestedAmount: true, currency: true, paymentAccountId: true, paymentAccountSnapshot: true, status: true } }),
    prisma.affiliatePayment.findMany({ select: { id: true, tenantId: true, withdrawalRequestId: true, amount: true, currency: true, status: true } }),
    prisma.affiliatePaymentAccount.findMany({ select: { id: true, tenantId: true, isDefault: true, status: true } }),
    commissionReconciliationService.preview(),
  ]);
  const tenantMap = new Map(tenants.map((row) => [row.id, row]));
  const withdrawalMap = new Map(withdrawals.map((row) => [row.id, row]));

  check(duplicateIds(commissions, 'referredTenantId').size === 0, 'One commission per referred tenant');
  check(duplicateIds(payments, 'withdrawalRequestId').size === 0, 'One payment per withdrawal request');
  check(commissions.every((row) => tenantMap.get(row.referredTenantId)?.referredByTenantId === row.referrerTenantId), 'Commission referral links match Tenant.referredByTenantId');
  check(payments.every((row) => {
    const request = withdrawalMap.get(row.withdrawalRequestId);
    return request && request.tenantId === row.tenantId && request.currency === row.currency && Number(request.requestedAmount) === Number(row.amount);
  }), 'Payments match withdrawal tenant, currency and amount');
  check(withdrawals.filter((row) => row.status === 'paid').every((row) => payments.some((payment) => payment.withdrawalRequestId === row.id && payment.status === 'paid')), 'Every paid withdrawal has a paid ledger record');
  check(withdrawals.every((row) => row.paymentAccountSnapshot && typeof row.paymentAccountSnapshot === 'object'), 'Every withdrawal preserves a payment account snapshot');

  const activeDefaults = accounts.filter((row) => row.status === 'active' && row.isDefault);
  check(duplicateIds(activeDefaults, 'tenantId').size === 0, 'At most one active default payment account per tenant');

  const earned = new Map(); const paid = new Map(); const reserved = new Map();
  const add = (map, tenantId, currency, amount) => { const key = `${tenantId}:${currency}`; map.set(key, (map.get(key) || 0) + Number(amount)); };
  commissions.filter((row) => row.status === 'earned' && row.currency && row.commissionAmount !== null).forEach((row) => add(earned, row.referrerTenantId, row.currency, row.commissionAmount));
  payments.filter((row) => row.status === 'paid').forEach((row) => add(paid, row.tenantId, row.currency, row.amount));
  withdrawals.filter((row) => ['pending', 'approved'].includes(row.status)).forEach((row) => add(reserved, row.tenantId, row.currency, row.requestedAmount));
  check([...new Set([...earned.keys(), ...paid.keys(), ...reserved.keys()])].every((key) => (earned.get(key) || 0) + 0.001 >= (paid.get(key) || 0) + (reserved.get(key) || 0)), 'Paid plus reserved amounts never exceed earned commission');

  check(createWithdrawalRequestSchema.safeParse({ body: { paymentAccountId: 1, currency: 'pkr', amount: '' } }).success, 'Blank withdrawal amount validation');
  check(payAffiliateWithdrawalSchema.safeParse({ params: { id: 1 }, body: { paymentMethod: 'Bank', paymentDate: '2026-08-21' } }).success, 'Manual payment validation');
  check(reconciliation.missingRecords >= 0 && reconciliation.pendingEligible >= 0, 'Reconciliation preview is available');

  console.log(JSON.stringify({
    success: failures.length === 0,
    summary: { checks: checks.length, passed: checks.filter((row) => row.passed).length, failed: failures.length },
    records: { tenants: tenants.length, commissions: commissions.length, withdrawals: withdrawals.length, payments: payments.length, paymentAccounts: accounts.length },
    reconciliation,
    failures,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  failures.push(error.message);
} finally {
  await prisma.$disconnect();
}

if (failures.length) process.exitCode = 1;
