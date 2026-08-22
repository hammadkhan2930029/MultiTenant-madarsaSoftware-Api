import { Prisma } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { auditService } from '../../security/index.js';

const include = { tenant: { select: { id: true, tenantCode: true, name: true, referralCode: true } }, payment: true };
const map = (row) => ({
  id: row.id, tenant: row.tenant, requestedAmount: row.requestedAmount.toFixed(2), currency: row.currency,
  paymentAccountId: row.paymentAccountId, paymentAccountSnapshot: row.paymentAccountSnapshot,
  status: row.status, requestNote: row.requestNote, adminNote: row.adminNote,
  requestedAt: row.requestedAt, reviewedAt: row.reviewedAt,
  payment: row.payment ? { id: row.payment.id, amount: row.payment.amount.toFixed(2), currency: row.payment.currency, paymentMethod: row.payment.paymentMethod, transactionReference: row.payment.transactionReference, paymentDate: row.payment.paymentDate, note: row.payment.note, status: row.payment.status } : null,
});
const get = async (client, id) => {
  const row = await client.affiliateWithdrawalRequest.findUnique({ where: { id }, include });
  if (!row) throw new AppError('Withdrawal request was not found.', 404);
  return row;
};
const recordAudit = (client, context, tenantId, entry) => auditService.recordAuditLog(client, {
  tenantId, actorUserId: context.adminId, branchId: null, roleId: context.audit?.roleId || null,
  module: 'affiliate', ipAddress: context.audit?.ipAddress || null, userAgent: context.audit?.userAgent || null,
  ...entry,
});

export const affiliateWithdrawalsService = {
  async list(query = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { tenant: { OR: [{ name: { contains: query.search } }, { tenantCode: { contains: query.search } }, { referralCode: { contains: query.search } }] } } : {}),
    };
    const [rows, totalItems] = await prisma.$transaction([
      prisma.affiliateWithdrawalRequest.findMany({ where, include, orderBy: { requestedAt: 'desc' }, skip, take: limit }),
      prisma.affiliateWithdrawalRequest.count({ where }),
    ]);
    return { items: rows.map(map), meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getById(id) { return map(await get(prisma, id)); },
  async reject(id, adminNote, context) {
    return prisma.$transaction(async (tx) => {
      const existing = await get(tx, id);
      if (existing.status !== 'pending') throw new AppError('Only a pending withdrawal request can be rejected.', 409);
      const updated = map(await tx.affiliateWithdrawalRequest.update({ where: { id }, data: { status: 'rejected', adminNote, reviewedByAdminId: context.adminId, reviewedAt: new Date() }, include }));
      await recordAudit(tx, context, existing.tenantId, { action: 'affiliate.withdrawal.rejected', targetType: 'affiliate_withdrawal_request', targetId: id, oldValue: { status: existing.status }, newValue: { status: updated.status, adminNote } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  async pay(id, payload, context) {
    return prisma.$transaction(async (tx) => {
      const existing = await get(tx, id);
      if (existing.status !== 'pending') throw new AppError('Only a pending withdrawal request can be paid.', 409);
      if (existing.payment) throw new AppError('Payment has already been recorded for this request.', 409);
      const paymentDate = new Date(payload.paymentDate);
      paymentDate.setUTCHours(0, 0, 0, 0);
      await tx.affiliatePayment.create({ data: {
        tenantId: existing.tenantId, withdrawalRequestId: existing.id,
        amount: existing.requestedAmount, currency: existing.currency,
        paymentMethod: payload.paymentMethod, transactionReference: payload.transactionReference?.trim() || null,
        paymentDate, note: payload.note?.trim() || null, paidByAdminId: context.adminId, status: 'paid',
      } });
      const updated = map(await tx.affiliateWithdrawalRequest.update({ where: { id }, data: { status: 'paid', adminNote: payload.note?.trim() || null, reviewedByAdminId: context.adminId, reviewedAt: new Date() }, include }));
      await recordAudit(tx, context, existing.tenantId, { action: 'affiliate.withdrawal.paid', targetType: 'affiliate_withdrawal_request', targetId: id, oldValue: { status: existing.status }, newValue: { status: updated.status, amount: updated.requestedAmount, currency: updated.currency, paymentId: updated.payment?.id || null, paymentMethod: updated.payment?.paymentMethod || null } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
