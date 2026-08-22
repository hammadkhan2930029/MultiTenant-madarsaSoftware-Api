import { Prisma } from '../../../generated/prisma/index.js';
import { prisma } from '../../../config/prisma.js';
import { auditService } from '../../security/index.js';

const GLOBAL_SCOPE_KEY = 'global';
const DEFAULT_SETTINGS = Object.freeze({
  id: null,
  withdrawalIntervalDays: 0,
  allowBlankWithdrawalAmount: true,
  allowOnlyOnePendingRequest: true,
  minimumWithdrawalAmount: null,
  status: 'active',
  createdByAdminId: null,
  updatedByAdminId: null,
  createdAt: null,
  updatedAt: null,
});

const mapSettings = (settings) => settings ? ({
  id: settings.id,
  withdrawalIntervalDays: settings.withdrawalIntervalDays,
  allowBlankWithdrawalAmount: settings.allowBlankWithdrawalAmount,
  allowOnlyOnePendingRequest: settings.allowOnlyOnePendingRequest,
  minimumWithdrawalAmount: settings.minimumWithdrawalAmount?.toFixed(2) || null,
  status: settings.status,
  createdByAdminId: settings.createdByAdminId,
  updatedByAdminId: settings.updatedByAdminId,
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
}) : { ...DEFAULT_SETTINGS };

const buildData = (payload, adminId) => ({
  withdrawalIntervalDays: payload.withdrawalIntervalDays,
  allowBlankWithdrawalAmount: payload.allowBlankWithdrawalAmount,
  allowOnlyOnePendingRequest: payload.allowOnlyOnePendingRequest,
  minimumWithdrawalAmount: payload.minimumWithdrawalAmount === null
    ? null
    : new Prisma.Decimal(payload.minimumWithdrawalAmount),
  status: payload.status,
  updatedByAdminId: adminId,
});

export const affiliateSettingsService = {
  async get() {
    const settings = await prisma.affiliateSetting.findUnique({ where: { scopeKey: GLOBAL_SCOPE_KEY } });
    return mapSettings(settings);
  },

  async update(payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.affiliateSetting.findUnique({ where: { scopeKey: GLOBAL_SCOPE_KEY } });
      const adminId = requester?.admin?.id || null;
      const settings = await tx.affiliateSetting.upsert({
        where: { scopeKey: GLOBAL_SCOPE_KEY },
        create: {
          scopeKey: GLOBAL_SCOPE_KEY,
          ...buildData(payload, adminId),
          createdByAdminId: adminId,
        },
        update: buildData(payload, adminId),
      });

      await auditService.recordAuditLog(tx, {
        tenantId: null,
        actorUserId: adminId,
        branchId: null,
        roleId: requester?.audit?.roleId || requester?.admin?.roleId || null,
        action: existing ? 'affiliate.settings.updated' : 'affiliate.settings.created',
        module: 'affiliate',
        targetType: 'affiliate_setting',
        targetId: settings.id,
        oldValue: existing ? mapSettings(existing) : null,
        newValue: mapSettings(settings),
        ipAddress: requester?.audit?.ipAddress || null,
        userAgent: requester?.audit?.userAgent || null,
      });

      return mapSettings(settings);
    });
  },
};
