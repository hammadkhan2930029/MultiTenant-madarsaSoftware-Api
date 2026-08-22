import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const moneyTotals = (rows, amountField) => Object.values(rows.reduce((totals, row) => {
  if (!row.currency || row[amountField] === null) return totals;
  const currency = row.currency.toUpperCase();
  totals[currency] ||= { currency, amount: 0 };
  totals[currency].amount += Number(row[amountField]);
  return totals;
}, {})).map((item) => ({ ...item, amount: item.amount.toFixed(2) }));

const tenantSelect = {
  id: true, tenantCode: true, name: true, referralCode: true, status: true,
};

const buildSummary = (tenant, commissions, payments) => ({
  ...tenant,
  referralCount: commissions.length,
  earned: moneyTotals(commissions.filter((item) => item.status === 'earned'), 'commissionAmount'),
  paid: moneyTotals(payments.filter((item) => item.status === 'paid'), 'amount'),
});

export const affiliateOverviewService = {
  async list(query = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search?.trim();
    const where = {
      referredTenants: { some: {} },
      ...(search ? { OR: [{ name: { contains: search } }, { tenantCode: { contains: search } }, { referralCode: { contains: search } }] } : {}),
    };
    const [tenants, totalItems] = await prisma.$transaction([
      prisma.tenant.findMany({ where, select: tenantSelect, orderBy: { id: 'desc' }, skip, take: limit }),
      prisma.tenant.count({ where }),
    ]);
    const ids = tenants.map((item) => item.id);
    const [commissions, payments] = ids.length ? await Promise.all([
      prisma.affiliateCommission.findMany({ where: { referrerTenantId: { in: ids } } }),
      prisma.affiliatePayment.findMany({ where: { tenantId: { in: ids } } }),
    ]) : [[], []];
    return {
      items: tenants.map((tenant) => buildSummary(
        tenant,
        commissions.filter((item) => item.referrerTenantId === tenant.id),
        payments.filter((item) => item.tenantId === tenant.id),
      )),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getTenantDetail(tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: tenantSelect });
    if (!tenant) throw new AppError('Tenant was not found.', 404);
    const [commissions, payments] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where: { referrerTenantId: tenantId },
        include: { referredTenant: { select: { ...tenantSelect, saleAmount: true, saleCurrency: true, referredAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliatePayment.findMany({ where: { tenantId }, orderBy: { paymentDate: 'desc' } }),
    ]);
    return {
      tenant: buildSummary(tenant, commissions, payments),
      referrals: commissions.map((item) => ({
        id: item.id,
        tenant: { ...item.referredTenant, saleAmount: item.referredTenant.saleAmount?.toFixed(2) || null },
        referralCountSnapshot: item.referralCountSnapshot,
        percentage: item.percentageSnapshot?.toFixed(2) || null,
        commissionAmount: item.commissionAmount?.toFixed(2) || null,
        currency: item.currency,
        status: item.status,
        earnedAt: item.earnedAt,
      })),
      payments: payments.map((item) => ({ ...item, amount: item.amount.toFixed(2) })),
    };
  },
};
