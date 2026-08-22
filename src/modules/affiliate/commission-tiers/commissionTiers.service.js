import { Prisma } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { auditService } from '../../security/index.js';

const toDate = (value) => new Date(`${value}T00:00:00.000Z`);
const toDateString = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;

const mapTier = (tier) => ({
  id: tier.id,
  minReferrals: tier.minReferrals,
  maxReferrals: tier.maxReferrals,
  percentage: tier.percentage.toFixed(2),
  effectiveFrom: toDateString(tier.effectiveFrom),
  effectiveTo: toDateString(tier.effectiveTo),
  status: tier.status,
  createdByAdminId: tier.createdByAdminId,
  updatedByAdminId: tier.updatedByAdminId,
  createdAt: tier.createdAt,
  updatedAt: tier.updatedAt,
});

const rangesOverlap = (firstMin, firstMax, secondMin, secondMax) => (
  firstMin <= (secondMax ?? Number.POSITIVE_INFINITY) &&
  secondMin <= (firstMax ?? Number.POSITIVE_INFINITY)
);

const datesOverlap = (firstStart, firstEnd, secondStart, secondEnd) => (
  firstStart <= (secondEnd || new Date('9999-12-31T00:00:00.000Z')) &&
  secondStart <= (firstEnd || new Date('9999-12-31T00:00:00.000Z'))
);

const assertNoActiveOverlap = async (client, payload, excludeId = null) => {
  if ((payload.status || 'active') !== 'active') return;

  const effectiveFrom = toDate(payload.effectiveFrom);
  const effectiveTo = payload.effectiveTo ? toDate(payload.effectiveTo) : null;
  const activeTiers = await client.affiliateCommissionTier.findMany({
    where: {
      status: 'active',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const conflict = activeTiers.find((tier) => (
    rangesOverlap(payload.minReferrals, payload.maxReferrals, tier.minReferrals, tier.maxReferrals) &&
    datesOverlap(effectiveFrom, effectiveTo, tier.effectiveFrom, tier.effectiveTo)
  ));

  if (conflict) {
    throw new AppError(
      `This referral range and effective period overlaps with commission tier #${conflict.id}.`,
      409,
    );
  }
};

const getTierOrThrow = async (client, id) => {
  const tier = await client.affiliateCommissionTier.findUnique({ where: { id } });
  if (!tier) throw new AppError('Affiliate commission tier was not found.', 404);
  return tier;
};

const buildData = (payload, adminId, isUpdate = false) => ({
  minReferrals: payload.minReferrals,
  maxReferrals: payload.maxReferrals,
  percentage: new Prisma.Decimal(payload.percentage),
  effectiveFrom: toDate(payload.effectiveFrom),
  effectiveTo: payload.effectiveTo ? toDate(payload.effectiveTo) : null,
  status: payload.status || 'active',
  ...(isUpdate ? { updatedByAdminId: adminId } : { createdByAdminId: adminId, updatedByAdminId: adminId }),
});

const recordAudit = (client, requester, entry) => auditService.recordAuditLog(client, {
  tenantId: null,
  actorUserId: requester?.admin?.id || null,
  branchId: null,
  roleId: requester?.audit?.roleId || requester?.admin?.roleId || null,
  module: 'affiliate',
  targetType: 'affiliate_commission_tier',
  ipAddress: requester?.audit?.ipAddress || null,
  userAgent: requester?.audit?.userAgent || null,
  ...entry,
});

export const commissionTiersService = {
  async list(query = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = query.status ? { status: query.status } : {};
    const [items, totalItems] = await prisma.$transaction([
      prisma.affiliateCommissionTier.findMany({
        where,
        orderBy: [{ minReferrals: 'asc' }, { effectiveFrom: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.affiliateCommissionTier.count({ where }),
    ]);

    return { items: items.map(mapTier), meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getById(id) {
    return mapTier(await getTierOrThrow(prisma, id));
  },

  async create(payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      await assertNoActiveOverlap(tx, payload);
      const tier = await tx.affiliateCommissionTier.create({
        data: buildData(payload, requester?.admin?.id || null),
      });
      await recordAudit(tx, requester, {
        action: 'affiliate.commission_tier.created',
        targetId: tier.id,
        newValue: mapTier(tier),
      });
      return mapTier(tier);
    });
  },

  async update(id, payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const existing = await getTierOrThrow(tx, id);
      await assertNoActiveOverlap(tx, payload, id);
      const tier = await tx.affiliateCommissionTier.update({
        where: { id },
        data: buildData(payload, requester?.admin?.id || null, true),
      });
      await recordAudit(tx, requester, {
        action: 'affiliate.commission_tier.updated',
        targetId: tier.id,
        oldValue: mapTier(existing),
        newValue: mapTier(tier),
      });
      return mapTier(tier);
    });
  },

  async updateStatus(id, status, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const existing = await getTierOrThrow(tx, id);
      const payload = {
        minReferrals: existing.minReferrals,
        maxReferrals: existing.maxReferrals,
        percentage: existing.percentage.toFixed(2),
        effectiveFrom: toDateString(existing.effectiveFrom),
        effectiveTo: toDateString(existing.effectiveTo),
        status,
      };
      await assertNoActiveOverlap(tx, payload, id);
      const tier = await tx.affiliateCommissionTier.update({
        where: { id },
        data: { status, updatedByAdminId: requester?.admin?.id || null },
      });
      await recordAudit(tx, requester, {
        action: 'affiliate.commission_tier.status_updated',
        targetId: tier.id,
        oldValue: { status: existing.status },
        newValue: { status: tier.status },
      });
      return mapTier(tier);
    });
  },
};
