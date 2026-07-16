import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { auditService } from '../security/index.js';

const BRANCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔ دوبارہ لاگ اِن کریں۔', 403);
  }

  return resolvedTenantId;
};

const branchSelect = {
  id: true,
  tenantId: true,
  name: true,
  code: true,
  address: true,
  contact: true,
  createdBy: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
    },
  },
  assignedAdmins: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      status: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      classes: true,
      assignedAdmins: true,
    },
  },
};

const defaultBranchData = {
  name: 'Main Campus',
  code: 'MC-01',
  address: 'Madarsa Road, Lahore',
  contact: null,
  status: 'active',
};

const recordBranchAudit = async (client, {
  tenantId,
  admin = null,
  action,
  targetId,
  oldValue = null,
  newValue = null,
  auditContext = {},
}) => auditService.recordAuditLog(client, {
  tenantId,
  actorUserId: admin?.id || null,
  branchId: newValue?.id || oldValue?.id || null,
  roleId: auditContext?.roleId || admin?.roleId || admin?.role_id || null,
  module: 'branches',
  action,
  targetType: 'branch',
  targetId,
  oldValue,
  newValue,
  ...auditContext,
});

const ensureDefaultBranch = async (tenantId) => {
  const existingBranch = await prisma.branch.findFirst({
    where: {
      tenantId,
      name: defaultBranchData.name,
    },
    select: branchSelect,
  });

  if (existingBranch) {
    return prisma.branch.update({
      where: { id: existingBranch.id, tenantId },
      data: defaultBranchData,
      select: branchSelect,
    });
  }

  return prisma.branch.create({
    data: {
      ...defaultBranchData,
      tenantId,
    },
    select: branchSelect,
  });
};

const normalizeOptionalString = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const normalizeBranchLimit = (value) => (
  value === null || value === undefined ? null : Number(value)
);

const getTenantBranchSettings = async (tenantId, client = prisma, { lock = false } = {}) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  const rows = lock
    ? await client.$queryRaw`
        SELECT id, branch_enabled, branch_limit
        FROM tenant
        WHERE id = ${resolvedTenantId}
        FOR UPDATE
      `
    : await client.$queryRaw`
        SELECT id, branch_enabled, branch_limit
        FROM tenant
        WHERE id = ${resolvedTenantId}
        LIMIT 1
      `;

  const tenant = rows[0];
  if (!tenant) {
    throw new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔', 403);
  }

  return {
    tenantId: Number(tenant.id),
    branchEnabled: Boolean(tenant.branch_enabled),
    branchLimit: normalizeBranchLimit(tenant.branch_limit),
  };
};

const getRemainingBranches = ({ branchEnabled, branchLimit, branchesCreated }) => {
  if (!branchEnabled) return 0;
  if (!Number.isInteger(branchLimit)) return 0;
  return Math.max(branchLimit - branchesCreated, 0);
};

const buildBranchLimitMeta = ({ settings, branchesCreated }) => ({
  branchEnabled: settings.branchEnabled,
  branchLimit: settings.branchLimit,
  branchesCreated,
  remainingBranches: getRemainingBranches({
    branchEnabled: settings.branchEnabled,
    branchLimit: settings.branchLimit,
    branchesCreated,
  }),
});

const assertBranchSystemEnabled = (settings) => {
  if (!settings.branchEnabled) {
    throw new AppError('اس مدرسہ کے لیے برانچ سسٹم فعال نہیں ہے۔', 403);
  }
};

const assertBranchLimitAvailable = ({ settings, branchesCreated }) => {
  if (Number.isInteger(settings.branchLimit) && branchesCreated >= settings.branchLimit) {
    throw new AppError('برانچ بنانے کی حد مکمل ہو چکی ہے۔ مزید برانچ بنانے کے لیے حد بڑھائیں۔', 400);
  }
};

const legacyBranchTables = [
  { key: 'students', label: 'Students', model: 'student', tableName: 'students' },
  { key: 'parents', label: 'Parents', model: 'parent', tableName: 'parents' },
  { key: 'teachers', label: 'Teachers', model: 'teacher', tableName: 'teachers' },
  { key: 'fundCollections', label: 'Fund Collections', model: 'fundCollection', tableName: 'fund_collections' },
  { key: 'salaryEntries', label: 'Salary Entries', model: 'salaryEntry', tableName: 'salary_entries' },
  { key: 'financeTransactions', label: 'Finance Transactions', model: 'financeTransaction', tableName: 'finance_transactions' },
  { key: 'financialRecords', label: 'Financial Records', model: 'financialRecord', tableName: 'financial_records' },
  { key: 'storeSupplierPayments', label: 'Store Supplier Payments', model: 'storeSupplierPayment', tableName: 'store_supplier_payments' },
  { key: 'storePurchases', label: 'Store Purchases', model: 'storePurchase', tableName: 'store_purchases' },
  { key: 'storePurchaseItems', label: 'Store Purchase Items', model: 'storePurchaseItem', tableName: 'store_purchase_items' },
  { key: 'storeStockIssues', label: 'Store Stock Issues', model: 'storeStockIssue', tableName: 'store_stock_issues' },
  { key: 'storeReturns', label: 'Store Returns', model: 'storeReturn', tableName: 'store_returns' },
  { key: 'storeDamagedStocks', label: 'Store Damaged Stocks', model: 'storeDamagedStock', tableName: 'store_damaged_stock' },
  { key: 'storeApprovalLogs', label: 'Store Approval Logs', model: 'storeApprovalLog', tableName: 'store_approval_logs' },
  { key: 'storeStockAdjustments', label: 'Store Stock Adjustments', model: 'storeStockAdjustment', tableName: 'store_stock_adjustments' },
  { key: 'examResults', label: 'Exam Results', model: 'examResult', tableName: 'exam_results' },
];

const normalizeMainBranchPayload = (payload = {}) => ({
  name: normalizeOptionalString(payload.name) || defaultBranchData.name,
  code: normalizeOptionalString(payload.code) || defaultBranchData.code,
  address: normalizeOptionalString(payload.address) || defaultBranchData.address,
  contact: normalizeOptionalString(payload.contact) || defaultBranchData.contact,
  status: 'active',
});

const countLegacyBranchRecords = async (tenantId, client = prisma) => {
  const entries = await Promise.all(
    legacyBranchTables.map(async (table) => {
      const count = await client[table.model].count({
        where: {
          tenantId,
          branchId: null,
        },
      });

      return {
        key: table.key,
        label: table.label,
        count,
      };
    })
  );

  return {
    totalUnassigned: entries.reduce((sum, item) => sum + item.count, 0),
    tables: entries,
  };
};

const countInvalidBranchOwnershipRecords = async (tenantId, client = prisma) => {
  const entries = await Promise.all(
    legacyBranchTables.map(async (table) => {
      const rows = await client.$queryRawUnsafe(
        `SELECT COUNT(*) AS count
         FROM ${table.tableName} r
         LEFT JOIN branches b ON b.id = r.branch_id AND b.tenant_id = r.tenant_id
         WHERE r.tenant_id = ? AND r.branch_id IS NOT NULL AND b.id IS NULL`,
        tenantId
      );
      const count = Number(rows?.[0]?.count || 0);

      return {
        key: table.key,
        label: table.label,
        count,
      };
    })
  );

  return {
    totalInvalid: entries.reduce((sum, item) => sum + item.count, 0),
    tables: entries,
  };
};

const findMainBranchCandidate = async (tenantId, mainBranch, client = prisma) => {
  const branches = await client.branch.findMany({
    where: {
      tenantId,
      OR: [
        { code: mainBranch.code },
        { name: mainBranch.name },
      ],
    },
    select: branchSelect,
  });

  const uniqueBranchIds = new Set(branches.map((branch) => branch.id));
  if (uniqueBranchIds.size > 1) {
    throw new AppError('مین برانچ کے نام یا کوڈ سے ایک سے زیادہ ریکارڈ مل رہے ہیں۔ پہلے برانچ ڈیٹا درست کریں۔', 409);
  }

  return branches[0] || null;
};

const buildLegacyMigrationWarnings = ({ settings, targetBranch, branchesCreated, legacyRecords, invalidOwnershipRecords }) => {
  const warnings = [
    'پری ویو اور اسٹیٹس APIs موجودہ لائیو ڈیٹا منتقل نہیں کرتیں۔',
    'جن پرانے ریکارڈز میں branchId موجود نہیں، برانچ یوزر انہیں نہیں دیکھ سکتا۔',
  ];

  if (legacyRecords.totalUnassigned > 0) {
    warnings.push('برانچ یوزرز کی رسائی سے پہلے پرانے ریکارڈز کو واضح اجازت کے ساتھ مین برانچ میں منتقل کرنا ہوگا۔');
  }

  if (invalidOwnershipRecords.totalInvalid > 0) {
    warnings.push('کچھ ریکارڈز ایسی برانچ سے منسلک ہیں جو اس مدرسہ/ادارے کی نہیں۔ مائیگریشن سے پہلے انہیں درست کریں۔');
  }

  if (!targetBranch && Number.isInteger(settings.branchLimit) && branchesCreated >= settings.branchLimit) {
    warnings.push('مین برانچ موجود نہیں اور برانچ حد مکمل ہو چکی ہے۔ مائیگریشن سے پہلے حد بڑھائیں یا جگہ خالی کریں۔');
  }

  return warnings;
};

const buildLegacyMigrationPreview = async (tenantId, mainBranch, client = prisma) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  const settings = await getTenantBranchSettings(resolvedTenantId, client);
  assertBranchSystemEnabled(settings);

  const [targetBranch, legacyRecords, invalidOwnershipRecords, branchesCreated] = await Promise.all([
    findMainBranchCandidate(resolvedTenantId, mainBranch, client),
    countLegacyBranchRecords(resolvedTenantId, client),
    countInvalidBranchOwnershipRecords(resolvedTenantId, client),
    client.branch.count({ where: { tenantId: resolvedTenantId } }),
  ]);

  const needsNewMainBranch = !targetBranch;
  const branchLimitAvailable = !Number.isInteger(settings.branchLimit) || branchesCreated < settings.branchLimit;
  const canExecute = invalidOwnershipRecords.totalInvalid === 0 && (!needsNewMainBranch || branchLimitAvailable);

  return {
    targetBranch,
    targetBranchDefaults: mainBranch,
    needsNewMainBranch,
    branchLimit: buildBranchLimitMeta({ settings, branchesCreated }),
    legacyRecords,
    invalidOwnershipRecords,
    migrationRequired: legacyRecords.totalUnassigned > 0,
    migrationComplete: legacyRecords.totalUnassigned === 0 && invalidOwnershipRecords.totalInvalid === 0,
    canExecute,
    stricterConstraintsReady: legacyRecords.totalUnassigned === 0 && invalidOwnershipRecords.totalInvalid === 0,
    branchUsersCanAccessLegacyRecords: false,
    warnings: buildLegacyMigrationWarnings({
      settings,
      targetBranch,
      branchesCreated,
      legacyRecords,
      invalidOwnershipRecords,
    }),
    note: 'مین برانچ صرف واضح execute migration API سے بنتی ہے۔ دوبارہ چلانے پر صرف وہی ریکارڈ اپ ڈیٹ ہوں گے جن کا branchId خالی ہے۔',
  };
};

const ensureMainBranchForMigration = async (tenantId, mainBranch, settings, admin = null, client = prisma) => {
  const existingBranch = await findMainBranchCandidate(tenantId, mainBranch, client);

  if (existingBranch) {
    return client.branch.update({
      where: { id: existingBranch.id, tenantId },
      data: {
        name: mainBranch.name,
        code: mainBranch.code,
        address: mainBranch.address,
        contact: mainBranch.contact,
        status: 'active',
      },
      select: branchSelect,
    });
  }

  const branchesCreated = await client.branch.count({ where: { tenantId } });
  assertBranchLimitAvailable({ settings, branchesCreated });

  return client.branch.create({
    data: {
      tenantId,
      ...mainBranch,
      createdBy: admin?.id || null,
    },
    select: branchSelect,
  });
};

export const branchesService = {
  async createBranch(tenantId, payload, admin = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);

    return prisma.$transaction(async (tx) => {
      const settings = await getTenantBranchSettings(resolvedTenantId, tx, { lock: true });
      assertBranchSystemEnabled(settings);

      const branchesCreated = await tx.branch.count({ where: { tenantId: resolvedTenantId } });
      assertBranchLimitAvailable({ settings, branchesCreated });

      const existingBranch = await tx.branch.findFirst({
        where: {
          tenantId: resolvedTenantId,
          OR: [{ name: payload.name }, { code: payload.code }],
        },
      });

      if (existingBranch) {
        throw new AppError('اسی نام یا کوڈ کے ساتھ برانچ پہلے سے موجود ہے۔', 409);
      }

      const branch = await tx.branch.create({
        data: {
          tenantId: resolvedTenantId,
          name: payload.name,
          code: payload.code,
          address: normalizeOptionalString(payload.address),
          contact: normalizeOptionalString(payload.contact),
          createdBy: admin?.id || null,
          status: payload.status || BRANCH_STATUS.ACTIVE,
        },
        select: branchSelect,
      });

      await recordBranchAudit(tx, {
        tenantId: resolvedTenantId,
        admin,
        action: 'branch.created',
        targetId: branch.id,
        oldValue: null,
        newValue: branch,
        auditContext,
      });

      return {
        ...branch,
        branchLimit: buildBranchLimitMeta({ settings, branchesCreated: branchesCreated + 1 }),
      };
    });
  },

  async getBranches(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const settings = await getTenantBranchSettings(resolvedTenantId);
    assertBranchSystemEnabled(settings);

    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { address: { contains: query.search } },
              { contact: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : { status: { not: BRANCH_STATUS.ARCHIVED } }),
    };

    const [items, totalItems, branchesCreated] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: branchSelect,
      }),
      prisma.branch.count({ where }),
      prisma.branch.count({ where: { tenantId: resolvedTenantId } }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
      branchLimit: buildBranchLimitMeta({ settings, branchesCreated }),
    };
  },

  async getBranchById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const settings = await getTenantBranchSettings(resolvedTenantId);
    assertBranchSystemEnabled(settings);

    const branch = await prisma.branch.findFirst({
      where: { id, tenantId: resolvedTenantId },
      select: {
        ...branchSelect,
        classes: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!branch) {
      throw new AppError('برانچ نہیں ملی یا آپ کو اس تک رسائی نہیں ہے۔', 404);
    }

    return branch;
  },

  async updateBranch(tenantId, id, payload, admin = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const settings = await getTenantBranchSettings(resolvedTenantId);
    assertBranchSystemEnabled(settings);

    return prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: { id, tenantId: resolvedTenantId },
      });

      if (!branch) {
        throw new AppError('برانچ نہیں ملی یا آپ کو اس تک رسائی نہیں ہے۔', 404);
      }

      const duplicateBranch = await tx.branch.findFirst({
        where: {
          tenantId: resolvedTenantId,
          id: { not: id },
          OR: [{ name: payload.name }, { code: payload.code }],
        },
      });

      if (duplicateBranch) {
        throw new AppError('اسی نام یا کوڈ کے ساتھ دوسری برانچ پہلے سے موجود ہے۔ محفوظ شدہ برانچ کا کوڈ دوبارہ استعمال نہیں ہو سکتا۔', 409);
      }

      const updatedBranch = await tx.branch.update({
        where: { id, tenantId: resolvedTenantId },
        data: {
          name: payload.name,
          code: payload.code,
          address: normalizeOptionalString(payload.address),
          contact: normalizeOptionalString(payload.contact),
          status: payload.status || branch.status,
        },
        select: branchSelect,
      });

      await recordBranchAudit(tx, {
        tenantId: resolvedTenantId,
        admin,
        action: branch.status === updatedBranch.status ? 'branch.updated' : 'branch.status.changed',
        targetId: id,
        oldValue: branch,
        newValue: updatedBranch,
        auditContext,
      });

      return updatedBranch;
    });
  },

  async deleteBranch(tenantId, id, admin = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const settings = await getTenantBranchSettings(resolvedTenantId);
    assertBranchSystemEnabled(settings);

    return prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: { id, tenantId: resolvedTenantId },
      });

      if (!branch) {
        throw new AppError('برانچ نہیں ملی یا آپ کو اس تک رسائی نہیں ہے۔', 404);
      }

      if (branch.name === defaultBranchData.name) {
        throw new AppError('مین برانچ حذف نہیں کی جا سکتی۔', 400);
      }

      const relatedCounts = await Promise.all([
        tx.admin.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.student.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.parent.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.teacher.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.academicClass.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.studentClassAssignment.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.studentAttendance.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.teacherAttendance.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.fundCollection.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.salaryEntry.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.financeTransaction.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.financialRecord.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeSupplierPayment.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storePurchase.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storePurchaseItem.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeStockIssue.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeReturn.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeDamagedStock.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeApprovalLog.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.storeStockAdjustment.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
        tx.examResult.count({ where: { tenantId: resolvedTenantId, branchId: id } }),
      ]);

      const hasDependencies = relatedCounts.some((count) => count > 0);

      if (hasDependencies) {
        throw new AppError(
          'یہ برانچ حذف نہیں ہو سکتی کیونکہ اس سے یوزرز، طلباء، مالیات، اسٹور یا تعلیمی ریکارڈ منسلک ہیں۔ اسے غیر فعال یا آرکائیو کریں۔',
          400
        );
      }

      const deletedBranch = await tx.branch.delete({
        where: { id, tenantId: resolvedTenantId },
        select: branchSelect,
      });

      await recordBranchAudit(tx, {
        tenantId: resolvedTenantId,
        admin,
        action: 'branch.hard_deleted',
        targetId: id,
        oldValue: branch,
        newValue: null,
        auditContext,
      });

      return deletedBranch;
    });
  },

  async archiveBranch(tenantId, id, admin = null, auditContext = {}) {
    const branch = await this.getBranchById(tenantId, id);
    return this.updateBranch(tenantId, id, {
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      contact: branch.contact || '',
      status: BRANCH_STATUS.ARCHIVED,
    }, admin, auditContext);
  },

  async getLegacyMigrationSummary(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const mainBranch = normalizeMainBranchPayload(query);

    return buildLegacyMigrationPreview(resolvedTenantId, mainBranch);
  },

  async getLegacyMigrationPreview(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const mainBranch = normalizeMainBranchPayload(query);

    return buildLegacyMigrationPreview(resolvedTenantId, mainBranch);
  },

  async getLegacyMigrationStatus(tenantId) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const mainBranch = normalizeMainBranchPayload();

    return buildLegacyMigrationPreview(resolvedTenantId, mainBranch);
  },

  async migrateLegacyDataToMainBranch(tenantId, payload = {}, admin = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const mainBranch = normalizeMainBranchPayload(payload);

    return prisma.$transaction(async (tx) => {
      const settings = await getTenantBranchSettings(resolvedTenantId, tx, { lock: true });
      assertBranchSystemEnabled(settings);

      const before = await countLegacyBranchRecords(resolvedTenantId, tx);
      const invalidOwnershipBefore = await countInvalidBranchOwnershipRecords(resolvedTenantId, tx);

      if (invalidOwnershipBefore.totalInvalid > 0) {
        throw new AppError('مائیگریشن نہیں چل سکتی کیونکہ کچھ ریکارڈز اس مدرسہ/ادارے سے باہر کی برانچ سے منسلک ہیں۔', 409);
      }

      const branch = await ensureMainBranchForMigration(resolvedTenantId, mainBranch, settings, admin, tx);
      const migratedTables = [];

      for (const table of legacyBranchTables) {
        const result = await tx[table.model].updateMany({
          where: {
            tenantId: resolvedTenantId,
            branchId: null,
          },
          data: {
            branchId: branch.id,
          },
        });

        migratedTables.push({
          key: table.key,
          label: table.label,
          migrated: result.count,
        });
      }

      const after = await countLegacyBranchRecords(resolvedTenantId, tx);
      const invalidOwnershipAfter = await countInvalidBranchOwnershipRecords(resolvedTenantId, tx);
      const branchesCreated = await tx.branch.count({ where: { tenantId: resolvedTenantId } });

      await auditService.recordAuditLog(tx, {
        tenantId: resolvedTenantId,
        actorUserId: admin?.id || null,
        branchId: branch.id,
        roleId: auditContext?.roleId || admin?.roleId || admin?.role_id || null,
        action: 'legacy_branch_migration',
        module: 'branches',
        targetType: 'branch',
        targetId: branch.id,
        oldValue: before,
        newValue: {
          branch,
          migratedTables,
          remainingLegacyRecords: after,
          invalidOwnershipRecords: invalidOwnershipAfter,
        },
        ...auditContext,
      });

      return {
        branch,
        branchLimit: buildBranchLimitMeta({ settings, branchesCreated }),
        before,
        invalidOwnershipBefore,
        migratedTables,
        after,
        invalidOwnershipAfter,
        migrationRequired: after.totalUnassigned > 0,
        migrationComplete: after.totalUnassigned === 0 && invalidOwnershipAfter.totalInvalid === 0,
        stricterConstraintsReady: after.totalUnassigned === 0 && invalidOwnershipAfter.totalInvalid === 0,
        branchUsersCanAccessLegacyRecords: false,
        note: 'مائیگریشن دوبارہ چلانے پر صرف وہی ریکارڈ اپ ڈیٹ کرے گی جن کا branchId خالی ہے۔',
      };
    });
  },
};
