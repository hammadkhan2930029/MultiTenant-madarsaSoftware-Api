import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { Prisma } from '../../../generated/prisma/index.js';
import { auditService } from '../../security/index.js';

const totals = (rows, field) => Object.values(rows.reduce((result, row) => {
  if (!row.currency || row[field] === null) return result;
  const currency = row.currency.toUpperCase();
  result[currency] ||= { currency, amount: 0 };
  result[currency].amount += Number(row[field]);
  return result;
}, {})).map((row) => ({ ...row, amount: row.amount.toFixed(2) }));

const mapAccount = (row) => ({
  id: row.id, accountType: row.accountType, accountTitle: row.accountTitle,
  institutionName: row.institutionName, accountNumber: row.accountNumber, iban: row.iban,
  walletPhone: row.walletPhone, branchName: row.branchName, instructions: row.instructions,
  isDefault: row.isDefault, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt,
});
const auditAccount = (row) => ({ id: row.id, accountType: row.accountType, accountTitle: row.accountTitle, institutionName: row.institutionName, isDefault: row.isDefault, status: row.status });
const clean = (value) => value?.trim() || null;
const accountData = (payload) => ({
  accountType: payload.accountType, accountTitle: payload.accountTitle.trim(),
  institutionName: clean(payload.institutionName), accountNumber: clean(payload.accountNumber),
  iban: clean(payload.iban), walletPhone: clean(payload.walletPhone), branchName: clean(payload.branchName),
  instructions: clean(payload.instructions), isDefault: Boolean(payload.isDefault), status: payload.status || 'active',
});
const getAccount = async (client, tenantId, id) => {
  const row = await client.affiliatePaymentAccount.findFirst({ where: { id, tenantId } });
  if (!row) throw new AppError('Payment account was not found.', 404);
  return row;
};

const GLOBAL_SCOPE_KEY = 'global';
const activeReservationStatuses = ['pending', 'approved'];
const amountForCurrency = (rows, currency, field) => rows
  .filter((row) => row.currency?.toUpperCase() === currency && row[field] !== null)
  .reduce((sum, row) => sum + Number(row[field]), 0);
const mapWithdrawal = (row) => ({
  id: row.id, requestedAmount: row.requestedAmount.toFixed(2), currency: row.currency,
  paymentAccountId: row.paymentAccountId, paymentAccountSnapshot: row.paymentAccountSnapshot,
  status: row.status, requestNote: row.requestNote, adminNote: row.adminNote,
  requestedAt: row.requestedAt, reviewedAt: row.reviewedAt,
});
const recordAudit = (client, context, entry) => auditService.recordAuditLog(client, {
  tenantId: context.tenantId, actorUserId: context.adminId, branchId: null,
  roleId: context.audit?.roleId || null, module: 'affiliate',
  ipAddress: context.audit?.ipAddress || null, userAgent: context.audit?.userAgent || null,
  ...entry,
});

export const createWithdrawalRequestInTransaction = async (tx, context, payload) => {
  const { tenantId, adminId } = context;
  const settings = await tx.affiliateSetting.findUnique({ where: { scopeKey: GLOBAL_SCOPE_KEY } });
  if (settings?.status === 'inactive') throw new AppError('Affiliate withdrawals are currently disabled.', 403);
  const account = await getAccount(tx, tenantId, payload.paymentAccountId);
  if (account.status !== 'active') throw new AppError('Please select an active payment account.', 422);
  const currency = payload.currency.toUpperCase();
  const [commissions, payments, reserved, lastRequest] = await Promise.all([
    tx.affiliateCommission.findMany({ where: { referrerTenantId: tenantId, status: 'earned', currency }, select: { commissionAmount: true, currency: true } }),
    tx.affiliatePayment.findMany({ where: { tenantId, status: 'paid', currency }, select: { amount: true, currency: true } }),
    tx.affiliateWithdrawalRequest.findMany({ where: { tenantId, status: { in: activeReservationStatuses } }, select: { requestedAmount: true, currency: true } }),
    tx.affiliateWithdrawalRequest.findFirst({ where: { tenantId, status: { notIn: ['rejected', 'cancelled'] } }, orderBy: { requestedAt: 'desc' } }),
  ]);
  if (settings?.allowOnlyOnePendingRequest && reserved.length) throw new AppError('You already have a pending withdrawal request.', 409);
  if (lastRequest && settings?.withdrawalIntervalDays > 0) {
    const nextAllowed = new Date(lastRequest.requestedAt);
    nextAllowed.setUTCDate(nextAllowed.getUTCDate() + settings.withdrawalIntervalDays);
    if (nextAllowed > new Date()) throw new AppError(`Next withdrawal request can be submitted on ${nextAllowed.toISOString().slice(0, 10)}.`, 429);
  }
  const available = amountForCurrency(commissions, currency, 'commissionAmount')
    - amountForCurrency(payments, currency, 'amount')
    - amountForCurrency(reserved, currency, 'requestedAmount');
  if (available <= 0) throw new AppError('No withdrawable balance is available in the selected currency.', 422);
  if ((payload.amount === null || payload.amount === undefined) && settings?.allowBlankWithdrawalAmount === false) throw new AppError('Withdrawal amount is required.', 422);
  const requested = payload.amount === null || payload.amount === undefined ? available : Number(payload.amount);
  if (requested > available) throw new AppError('Requested amount exceeds the available balance.', 422);
  if (settings?.minimumWithdrawalAmount && requested < Number(settings.minimumWithdrawalAmount)) throw new AppError(`Minimum withdrawal amount is ${settings.minimumWithdrawalAmount.toFixed(2)} ${currency}.`, 422);
  const snapshot = {
    id: account.id, accountType: account.accountType, accountTitle: account.accountTitle,
    institutionName: account.institutionName, accountNumber: account.accountNumber,
    iban: account.iban, walletPhone: account.walletPhone, branchName: account.branchName,
    instructions: account.instructions, capturedAt: new Date().toISOString(),
  };
  const request = await tx.affiliateWithdrawalRequest.create({ data: {
    tenantId, requestedAmount: new Prisma.Decimal(requested.toFixed(2)), currency,
    paymentAccountId: account.id, paymentAccountSnapshot: snapshot,
    requestNote: payload.requestNote?.trim() || null, requestedByAdminId: adminId,
  } });
  const mapped = mapWithdrawal(request);
  await recordAudit(tx, context, { action: 'affiliate.withdrawal.requested', targetType: 'affiliate_withdrawal_request', targetId: request.id, newValue: { requestedAmount: mapped.requestedAmount, currency: mapped.currency, paymentAccountId: mapped.paymentAccountId, status: mapped.status } });
  return mapped;
};

export const affiliateWalletService = {
  async getWallet({ tenantId }) {
    const [tenant, commissions, payments, accounts, withdrawals, settings] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, referralCode: true } }),
      prisma.affiliateCommission.findMany({ where: { referrerTenantId: tenantId }, include: { referredTenant: { select: { id: true, tenantCode: true, name: true, status: true, referredAt: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.affiliatePayment.findMany({ where: { tenantId, status: 'paid' } }),
      prisma.affiliatePaymentAccount.findMany({ where: { tenantId }, orderBy: [{ isDefault: 'desc' }, { id: 'desc' }] }),
      prisma.affiliateWithdrawalRequest.findMany({ where: { tenantId }, orderBy: { requestedAt: 'desc' } }),
      prisma.affiliateSetting.findUnique({ where: { scopeKey: GLOBAL_SCOPE_KEY } }),
    ]);
    if (!tenant) throw new AppError('Tenant was not found.', 404);
    const earned = totals(commissions.filter((row) => row.status === 'earned'), 'commissionAmount');
    const paid = totals(payments, 'amount');
    const pending = totals(withdrawals.filter((row) => activeReservationStatuses.includes(row.status)), 'requestedAmount');
    const balance = earned.map((row) => ({ currency: row.currency, amount: Math.max(0, Number(row.amount) - Number(paid.find((item) => item.currency === row.currency)?.amount || 0)).toFixed(2) }));
    return {
      tenant, earned, paid,
      balance, pending,
      available: balance.map((row) => ({ currency: row.currency, amount: Math.max(0, Number(row.amount) - Number(pending.find((item) => item.currency === row.currency)?.amount || 0)).toFixed(2) })),
      referrals: commissions.map((row) => ({ id: row.id, tenant: row.referredTenant, percentage: row.percentageSnapshot?.toFixed(2) || null, commissionAmount: row.commissionAmount?.toFixed(2) || null, currency: row.currency, status: row.status, earnedAt: row.earnedAt })),
      accounts: accounts.map(mapAccount),
      withdrawals: withdrawals.map(mapWithdrawal),
      withdrawalRules: {
        enabled: settings?.status !== 'inactive',
        withdrawalIntervalDays: settings?.withdrawalIntervalDays || 0,
        allowBlankWithdrawalAmount: settings?.allowBlankWithdrawalAmount ?? true,
        allowOnlyOnePendingRequest: settings?.allowOnlyOnePendingRequest ?? true,
        minimumWithdrawalAmount: settings?.minimumWithdrawalAmount?.toFixed(2) || null,
      },
    };
  },
  async createAccount(context, payload) {
    const { tenantId, adminId } = context;
    return prisma.$transaction(async (tx) => {
      const makeDefault = Boolean(payload.isDefault) || await tx.affiliatePaymentAccount.count({ where: { tenantId, status: 'active' } }) === 0;
      if (makeDefault) await tx.affiliatePaymentAccount.updateMany({ where: { tenantId }, data: { isDefault: false } });
      const account = mapAccount(await tx.affiliatePaymentAccount.create({ data: { tenantId, createdByAdminId: adminId, ...accountData({ ...payload, isDefault: makeDefault }) } }));
      await recordAudit(tx, context, { action: 'affiliate.payment_account.created', targetType: 'affiliate_payment_account', targetId: account.id, newValue: auditAccount(account) });
      return account;
    });
  },
  async updateAccount(context, id, payload) {
    const { tenantId } = context;
    return prisma.$transaction(async (tx) => {
      const existing = mapAccount(await getAccount(tx, tenantId, id));
      if (payload.isDefault) await tx.affiliatePaymentAccount.updateMany({ where: { tenantId, id: { not: id } }, data: { isDefault: false } });
      const account = mapAccount(await tx.affiliatePaymentAccount.update({ where: { id }, data: accountData(payload) }));
      await recordAudit(tx, context, { action: 'affiliate.payment_account.updated', targetType: 'affiliate_payment_account', targetId: id, oldValue: auditAccount(existing), newValue: auditAccount(account) });
      return account;
    });
  },
  async deactivateAccount(context, id) {
    const { tenantId } = context;
    return prisma.$transaction(async (tx) => {
      const account = await getAccount(tx, tenantId, id);
      const pending = await tx.affiliateWithdrawalRequest.count({ where: { tenantId, paymentAccountId: id, status: 'pending' } });
      if (pending) throw new AppError('This account is being used by a pending withdrawal request.', 409);
      const updated = mapAccount(await tx.affiliatePaymentAccount.update({ where: { id }, data: { status: 'inactive', isDefault: false } }));
      await recordAudit(tx, context, { action: 'affiliate.payment_account.deactivated', targetType: 'affiliate_payment_account', targetId: id, oldValue: { status: account.status, isDefault: account.isDefault }, newValue: { status: updated.status, isDefault: updated.isDefault } });
      return updated;
    });
  },
  async createWithdrawalRequest(context, payload) {
    return prisma.$transaction((tx) => createWithdrawalRequestInTransaction(tx, context, payload), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
