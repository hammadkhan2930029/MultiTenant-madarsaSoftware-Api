import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { auditService, branchScopeService } from '../security/index.js';

const getCurrentMonthRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { startDate, endDate };
};

const toAmount = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeId = (id) => {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    throw new AppError('آئٹم آئی ڈی درست نہیں۔', 400);
  }
  return parsedId;
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);
  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }
  return resolvedTenantId;
};

const normalizeNumber = (value, fieldName) => {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new AppError(`${fieldName} درست مثبت عدد ہونا چاہیے۔`, 400);
  }
  return numberValue;
};

const normalizeText = (value) => String(value || '').trim();

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || queryOrPayload.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

const recordStoreAudit = (entry, auditContext = {}) => auditService.recordAuditLog(prisma, {
  tenantId: entry.tenantId,
  actorUserId: auditContext.actorUserId || null,
  branchId: entry.branchId || auditContext.branchId || null,
  roleId: auditContext.roleId || null,
  module: 'store',
  targetType: entry.targetType || 'store_record',
  targetId: entry.targetId,
  ipAddress: auditContext.ipAddress || null,
  userAgent: auditContext.userAgent || null,
  ...entry,
});
let storeItemTablePromise = null;
let storeItemColumnSetPromise = null;
let storeUnitTablePromise = null;
let storeCategoryTablePromise = null;
let storePurchaseTablePromise = null;

const DEFAULT_STORE_UNITS = [
  { name: 'عدد', shortName: 'piece', description: 'گنتی کی اکائی' },
  { name: 'کلوگرام', shortName: 'kg', description: 'وزن کی اکائی' },
  { name: 'لیٹر', shortName: 'liter', description: 'مائع کی اکائی' },
  { name: 'میٹر', shortName: 'meter', description: 'لمبائی کی اکائی' },
  { name: 'درجن', shortName: 'dozen', description: 'درجن کی اکائی' },
];

const ensureStoreItemsTable = async () => {
  if (!storeItemTablePromise) {
    storeItemTablePromise = prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS store_items (
        id INTEGER NOT NULL AUTO_INCREMENT,
        tenant_id INTEGER NOT NULL,
        itemName VARCHAR(150) NOT NULL,
        category VARCHAR(150) NOT NULL,
        description VARCHAR(255) NULL,
        unit VARCHAR(50) NOT NULL,
        itemCode VARCHAR(100) NOT NULL,
        currentStock DECIMAL(10, 2) NOT NULL DEFAULT 0,
        purchasePrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        UNIQUE INDEX store_items_tenant_item_code_uq(tenant_id, itemCode),
        INDEX store_items_tenant_id_idx(tenant_id),
        INDEX store_items_category_idx(category),
        INDEX store_items_status_idx(status),
        PRIMARY KEY (id)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `;
  }
  await storeItemTablePromise;
};

const getStoreItemColumnSet = async () => {
  await ensureStoreItemsTable();
  if (!storeItemColumnSetPromise) {
    storeItemColumnSetPromise = prisma.$queryRaw`
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_items'
    `.then((rows) => new Set(rows.map((row) => row.columnName || row.COLUMN_NAME).filter(Boolean)));
  }
  return storeItemColumnSetPromise;
};

const ensureStoreItemDescriptionColumn = async () => {
  const columnSet = await getStoreItemColumnSet();
  if (!columnSet.has('description')) {
    await prisma.$executeRaw`ALTER TABLE store_items ADD COLUMN description VARCHAR(255) NULL`;
    storeItemColumnSetPromise = null;
  }
};

const ensureStoreUnitsTable = async () => {
  if (!storeUnitTablePromise) {
    storeUnitTablePromise = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_units (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          name VARCHAR(150) NOT NULL,
          shortName VARCHAR(50) NOT NULL,
          description VARCHAR(255) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          UNIQUE INDEX store_units_tenant_short_name_uq(tenant_id, shortName),
          INDEX store_units_tenant_id_idx(tenant_id),
          INDEX store_units_status_idx(status),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;

    })();
  }
  await storeUnitTablePromise;
};

const ensureDefaultStoreUnitsForTenant = async (tenantId) => {
  await ensureStoreUnitsTable();
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM store_units
    WHERE tenant_id = ${tenantId}
  `;

  if (Number(rows?.[0]?.total || 0) > 0) {
    return;
  }

  const now = new Date();
  for (const unit of DEFAULT_STORE_UNITS) {
    await prisma.$executeRaw`
      INSERT INTO store_units (tenant_id, name, shortName, description, status, createdAt, updatedAt)
      VALUES (${tenantId}, ${unit.name}, ${unit.shortName}, ${unit.description}, 'active', ${now}, ${now})
    `;
  }
};

const ensureStoreCategoriesTable = async () => {
  if (!storeCategoryTablePromise) {
    storeCategoryTablePromise = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_categories (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          name VARCHAR(150) NOT NULL,
          description VARCHAR(255) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          UNIQUE INDEX store_categories_tenant_name_uq(tenant_id, name),
          INDEX store_categories_tenant_id_idx(tenant_id),
          INDEX store_categories_status_idx(status),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;

      const rows = [{ total: 1 }];
      if (Number(rows?.[0]?.total || 0) === 0) {
        const now = new Date();
        await prisma.$executeRaw`
          INSERT INTO store_categories (name, description, status, createdAt, updatedAt)
          VALUES
            ('راشن', 'کھانے پینے اور روزمرہ استعمال کی اشیاء', 'active', ${now}, ${now}),
            ('اسٹیشنری', 'تعلیمی اور دفتری سامان', 'active', ${now}, ${now}),
            ('صفائی', 'صفائی سے متعلق سامان', 'active', ${now}, ${now})
        `;
      }
    })();
  }
  await storeCategoryTablePromise;
};

const ensureStorePurchaseTables = async () => {
  await ensureStoreItemsTable();
  await ensureStoreUnitsTable();

  if (!storePurchaseTablePromise) {
    storePurchaseTablePromise = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_suppliers (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          supplierName VARCHAR(150) NOT NULL,
          mobileNumber VARCHAR(50) NULL,
          address VARCHAR(255) NULL,
          shopName VARCHAR(150) NULL,
          balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          UNIQUE INDEX store_suppliers_tenant_name_uq(tenant_id, supplierName),
          INDEX store_suppliers_tenant_id_idx(tenant_id),
          INDEX store_suppliers_status_idx(status),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_purchases (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          branch_id INTEGER NULL,
          purchaseDate DATETIME(3) NOT NULL,
          supplierId INTEGER NOT NULL,
          invoiceNumber VARCHAR(100) NULL,
          totalAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          paidAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          remainingAmount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          paymentMethod VARCHAR(50) NULL,
          invoiceImage VARCHAR(255) NULL,
          approvalStatus VARCHAR(50) NOT NULL DEFAULT 'approved',
          financeTransactionId INTEGER NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          INDEX store_purchases_purchaseDate_status_idx(purchaseDate, status),
          INDEX store_purchases_branch_id_idx(branch_id),
          INDEX store_purchases_tenant_id_branch_id_idx(tenant_id, branch_id),
          INDEX store_purchases_tenant_id_idx(tenant_id),
          INDEX store_purchases_supplierId_idx(supplierId),
          INDEX store_purchases_financeTransactionId_idx(financeTransactionId),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_purchase_items (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          branch_id INTEGER NULL,
          purchaseId INTEGER NOT NULL,
          itemId INTEGER NOT NULL,
          unitId INTEGER NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          rate DECIMAL(10, 2) NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          INDEX store_purchase_items_purchaseId_idx(purchaseId),
          INDEX store_purchase_items_branch_id_idx(branch_id),
          INDEX store_purchase_items_tenant_id_branch_id_idx(tenant_id, branch_id),
          INDEX store_purchase_items_tenant_id_idx(tenant_id),
          INDEX store_purchase_items_itemId_idx(itemId),
          INDEX store_purchase_items_unitId_idx(unitId),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;

      const purchaseItemColumns = await prisma.$queryRaw`
        SELECT COLUMN_NAME AS columnName
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_purchase_items'
      `;
      const purchaseItemColumnSet = new Set(purchaseItemColumns.map((row) => row.columnName || row.COLUMN_NAME).filter(Boolean));
      if (!purchaseItemColumnSet.has('unitId')) {
        await prisma.$executeRaw`ALTER TABLE store_purchase_items ADD COLUMN unitId INTEGER NULL AFTER itemId`;
      }

      const purchaseItemIndexes = await prisma.$queryRaw`
        SELECT INDEX_NAME AS indexName
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_purchase_items'
      `;
      const purchaseItemIndexSet = new Set(purchaseItemIndexes.map((row) => row.indexName || row.INDEX_NAME).filter(Boolean));
      if (!purchaseItemIndexSet.has('store_purchase_items_unitId_idx')) {
        await prisma.$executeRaw`ALTER TABLE store_purchase_items ADD INDEX store_purchase_items_unitId_idx(unitId)`;
      }

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS store_supplier_payments (
          id INTEGER NOT NULL AUTO_INCREMENT,
          tenant_id INTEGER NOT NULL,
          supplierId INTEGER NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          paymentDate DATETIME(3) NOT NULL,
          paymentMethod VARCHAR(50) NULL,
          note VARCHAR(255) NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt DATETIME(3) NOT NULL,
          INDEX store_supplier_payments_supplierId_idx(supplierId),
          INDEX store_supplier_payments_tenant_id_idx(tenant_id),
          INDEX store_supplier_payments_paymentDate_status_idx(paymentDate, status),
          PRIMARY KEY (id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `;
    })();
  }

  await storePurchaseTablePromise;
};

const normalizeStatus = (value) => {
  const status = normalizeText(value) || 'active';
  if (!['active', 'inactive'].includes(status)) {
    throw new AppError('حالت درست منتخب کریں۔', 400);
  }
  return status;
};

const mapStoreUnit = (unit) => ({
  ...unit,
  id: Number(unit.id),
});

const mapStoreCategory = (category) => ({
  ...category,
  id: Number(category.id),
});

const validateUnitPayload = (payload) => {
  const name = normalizeText(payload.name);
  const shortName = normalizeText(payload.shortName);
  if (!name) throw new AppError('اکائی کا نام ضروری ہے۔', 400);
  if (!shortName) throw new AppError('مختصر نام ضروری ہے۔', 400);

  return {
    name,
    shortName,
    description: normalizeText(payload.description) || null,
    status: normalizeStatus(payload.status),
  };
};

const validateCategoryPayload = (payload) => {
  const name = normalizeText(payload.name);
  if (!name) throw new AppError('کیٹیگری کا نام ضروری ہے۔', 400);

  return {
    name,
    description: normalizeText(payload.description) || null,
    status: normalizeStatus(payload.status),
  };
};

const normalizeApprovalStatus = (value, fallback = 'approved') => {
  const status = normalizeText(value) || fallback;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    throw new AppError('منظوری کی حالت درست نہیں ہے۔', 400);
  }
  return status;
};

const validateItemPayload = (payload) => {
  const itemName = normalizeText(payload.itemName);
  const category = normalizeText(payload.category);
  const description = normalizeText(payload.description) || null;
  const unit = normalizeText(payload.unit);
  const itemCode = normalizeText(payload.itemCode);

  if (!itemName) throw new AppError('شے کا نام ضروری ہے۔', 400);
  if (!category) throw new AppError('کیٹیگری ضروری ہے۔', 400);

  const quantity = payload.quantity === undefined || payload.quantity === null || payload.quantity === ''
    ? 0
    : normalizeNumber(payload.quantity, 'مقدار');
  const purchasePrice = payload.purchasePrice === undefined || payload.purchasePrice === null || payload.purchasePrice === ''
    ? 0
    : normalizeNumber(payload.purchasePrice, 'خریداری قیمت');

  return {
    itemName,
    category,
    description,
    unit,
    itemCode,
    quantity,
    purchasePrice,
    status: normalizeStatus(payload.status),
  };
};

const mapItem = (item) => ({
  ...item,
  id: Number(item.id),
  currentStock: toAmount(item.currentStock),
  purchasePrice: toAmount(item.purchasePrice),
});

const mapSupplier = (supplier) => ({
  ...supplier,
  id: Number(supplier.id),
  balance: toAmount(supplier.balance),
});

const mapSupplierPayment = (payment) => ({
  ...payment,
  id: Number(payment.id),
  supplierId: Number(payment.supplierId),
  amount: toAmount(payment.amount),
});

const validateSupplierPayload = (payload) => {
  const supplierName = normalizeText(payload.supplierName);
  if (!supplierName) throw new AppError('سپلائر کا نام ضروری ہے۔', 400);

  return {
    supplierName,
    mobileNumber: normalizeText(payload.mobileNumber) || null,
    address: normalizeText(payload.address) || null,
    shopName: normalizeText(payload.shopName) || null,
    balance: normalizeNumber(payload.balance, 'بیلنس'),
  };
};

const validatePaymentPayload = (payload) => {
  const amount = normalizeNumber(payload.amount, 'رقم');
  if (amount <= 0) throw new AppError('رقم صفر سے زیادہ ہونی چاہیے۔', 400);

  const paymentDate = new Date(payload.paymentDate);
  if (Number.isNaN(paymentDate.getTime())) throw new AppError('ادائیگی کی تاریخ درست درج کریں۔', 400);
  paymentDate.setHours(0, 0, 0, 0);

  return {
    amount,
    paymentDate,
    paymentMethod: normalizeText(payload.paymentMethod) || null,
    note: normalizeText(payload.note) || null,
  };
};

const ensureUniqueSupplierName = async (tenantId, supplierName, ignoredId = null) => {
  const rows = ignoredId
    ? await prisma.$queryRaw`SELECT id FROM store_suppliers WHERE tenant_id = ${tenantId} AND supplierName = ${supplierName} AND id <> ${ignoredId} LIMIT 1`
    : await prisma.$queryRaw`SELECT id FROM store_suppliers WHERE tenant_id = ${tenantId} AND supplierName = ${supplierName} LIMIT 1`;

  if (rows.length) throw new AppError('یہ سپلائر پہلے سے موجود ہے۔', 409);
};

const mapPurchaseItem = (item) => ({
  ...item,
  id: Number(item.id),
  purchaseId: Number(item.purchaseId),
  itemId: Number(item.itemId),
  unitId: item.unitId === null || item.unitId === undefined ? null : Number(item.unitId),
  quantity: toAmount(item.quantity),
  rate: toAmount(item.rate),
  unitPrice: toAmount(item.unitPrice === undefined ? item.rate : item.unitPrice),
  total: toAmount(item.total),
  totalAmount: toAmount(item.totalAmount === undefined ? item.total : item.totalAmount),
});

const mapPurchase = (purchase, items = []) => ({
  ...purchase,
  id: Number(purchase.id),
  supplierId: Number(purchase.supplierId),
  totalAmount: toAmount(purchase.totalAmount),
  paidAmount: toAmount(purchase.paidAmount),
  remainingAmount: toAmount(purchase.remainingAmount),
  items: items.map(mapPurchaseItem),
});

const normalizePurchaseDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('خریداری کی تاریخ درست درج کریں۔', 400);
  date.setHours(0, 0, 0, 0);
  return date;
};

const resolvePurchaseUnitId = async (tenantId, itemId, value) => {
  if (value !== undefined && value !== null && value !== '') {
    const unitId = normalizeId(value);
    const unitRows = await prisma.$queryRaw`
      SELECT id
      FROM store_units
      WHERE id = ${unitId} AND tenant_id = ${tenantId} AND status = 'active'
      LIMIT 1
    `;
    if (!unitRows.length) throw new AppError('منتخب اکائی نہیں ملی یا غیر فعال ہے۔', 404);
    return unitId;
  }

  const fallbackRows = await prisma.$queryRaw`
    SELECT u.id
    FROM store_items i
    JOIN store_units u
      ON u.tenant_id = i.tenant_id
      AND u.status = 'active'
      AND (u.name = i.unit OR u.shortName = i.unit)
    WHERE i.id = ${itemId} AND i.tenant_id = ${tenantId}
    LIMIT 1
  `;
  if (fallbackRows.length) return Number(fallbackRows[0].id);

  const firstActiveUnit = await prisma.$queryRaw`
    SELECT id
    FROM store_units
    WHERE tenant_id = ${tenantId} AND status = 'active'
    ORDER BY id ASC
    LIMIT 1
  `;
  if (firstActiveUnit.length) return Number(firstActiveUnit[0].id);

  throw new AppError('اکائی منتخب کرنا ضروری ہے۔', 400);
};

const parseItemsPayload = async (tenantId, items) => {
  const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    throw new AppError('کم از کم ایک شے شامل کرنا ضروری ہے۔', 400);
  }

  const parsedRows = [];
  for (const item of parsedItems) {
    const itemId = normalizeId(item.itemId);
    const quantity = normalizeNumber(item.quantity, 'مقدار');
    const unitPriceValue = item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === '' ? item.rate : item.unitPrice;
    const rate = normalizeNumber(unitPriceValue, 'فی اکائی رقم');
    if (quantity <= 0) throw new AppError('مقدار صفر سے زیادہ ہونی چاہیے۔', 400);
    const itemRows = await prisma.$queryRaw`
      SELECT id
      FROM store_items
      WHERE id = ${itemId} AND tenant_id = ${tenantId} AND status = 'active'
      LIMIT 1
    `;
    if (!itemRows.length) throw new AppError('منتخب شے نہیں ملی۔', 404);

    const unitId = await resolvePurchaseUnitId(tenantId, itemId, item.unitId);

    const total = quantity * rate;
    parsedRows.push({ itemId, unitId, quantity, rate, unitPrice: rate, total });
  }

  return parsedRows;
};

const buildInvoiceImagePath = (file) => (file ? `/uploads/store-invoices/${file.filename}` : null);
const buildIssueSignaturePath = (file) => (file ? `/uploads/store-issue-signatures/${file.filename}` : null);

const normalizeIssueDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('اجراء کی تاریخ درست درج کریں۔', 400);
  date.setHours(0, 0, 0, 0);
  return date;
};

const validateStockIssuePayload = (payload) => {
  const itemId = normalizeId(payload.itemId);
  const quantity = normalizeNumber(payload.quantity, 'مقدار');
  if (quantity <= 0) throw new AppError('مقدار صفر سے زیادہ ہونی چاہیے۔', 400);

  const department = normalizeText(payload.department);
  const receiverName = normalizeText(payload.receiverName);
  const issuedBy = normalizeText(payload.issuedBy);
  if (!department) throw new AppError('شعبہ درج کرنا ضروری ہے۔', 400);
  if (!receiverName) throw new AppError('وصول کرنے والے کا نام ضروری ہے۔', 400);
  if (!issuedBy) throw new AppError('اجراء کرنے والے کا نام ضروری ہے۔', 400);

  return {
    issueDate: normalizeIssueDate(payload.issueDate),
    itemId,
    quantity,
    department,
    receiverName,
    purpose: normalizeText(payload.purpose) || null,
    issuedBy,
    approvalStatus: normalizeApprovalStatus(payload.approvalStatus),
  };
};

const mapStockIssue = (issue) => ({
  ...issue,
  id: Number(issue.id),
  itemId: Number(issue.itemId),
  quantity: toAmount(issue.quantity),
  returnedQuantity: toAmount(issue.returnedQuantity),
  currentStock: issue.currentStock === undefined ? undefined : toAmount(issue.currentStock),
});

const getStockIssueRows = async (tenantId, id, branchId = null) => {
  const issueId = normalizeId(id);
  const rows = await prisma.$queryRaw`
    SELECT si.*, i.itemName, i.unit, i.currentStock
    FROM store_stock_issues si
    JOIN store_items i ON i.id = si.itemId
    WHERE si.id = ${issueId}
      AND si.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR si.branch_id = ${branchId})
      AND i.tenant_id = ${tenantId}
      AND si.status = 'active'
    LIMIT 1
  `;
  if (!rows.length) throw new AppError('اسٹاک اجراء ریکارڈ نہیں ملا۔', 404);
  return mapStockIssue(rows[0]);
};

const ensureIssueStock = async (tx, tenantId, itemId, quantity) => {
  const rows = await tx.$queryRaw`SELECT currentStock FROM store_items WHERE id = ${itemId} AND tenant_id = ${tenantId} AND status = 'active' LIMIT 1`;
  if (!rows.length) throw new AppError('منتخب شے نہیں ملی۔', 404);
  if (toAmount(rows[0].currentStock) < quantity) throw new AppError('موجودہ اسٹاک مطلوبہ مقدار سے کم ہے۔', 400);
};

const applyIssueStockChange = async (tx, tenantId, itemId, quantity, multiplier) => {
  if (multiplier < 0) await ensureIssueStock(tx, tenantId, itemId, quantity);
  await tx.$executeRaw`
    UPDATE store_items
    SET currentStock = currentStock + ${quantity * multiplier}, updatedAt = ${new Date()}
    WHERE id = ${itemId} AND tenant_id = ${tenantId}
  `;
};

const mapStoreReturn = (item) => ({
  ...item,
  id: Number(item.id),
  stockIssueId: Number(item.stockIssueId),
  itemId: Number(item.itemId),
  returnQuantity: toAmount(item.returnQuantity),
  issuedQuantity: item.issuedQuantity === undefined ? undefined : toAmount(item.issuedQuantity),
  returnedQuantity: item.returnedQuantity === undefined ? undefined : toAmount(item.returnedQuantity),
});

const validateReturnPayload = (payload) => {
  const stockIssueId = normalizeId(payload.stockIssueId);
  const returnQuantity = normalizeNumber(payload.returnQuantity, 'واپسی مقدار');
  if (returnQuantity <= 0) throw new AppError('واپسی مقدار صفر سے زیادہ ہونی چاہیے۔', 400);
  const condition = normalizeText(payload.condition) || 'good';
  if (!['good', 'damaged'].includes(condition)) throw new AppError('حالت درست منتخب کریں۔', 400);
  const addToStock = payload.addToStock === true || payload.addToStock === 'true';

  return {
    stockIssueId,
    returnQuantity,
    condition,
    addToStock,
    note: normalizeText(payload.note) || null,
  };
};

const getReturnRows = async (tenantId, id, branchId = null) => {
  const returnId = normalizeId(id);
  const rows = await prisma.$queryRaw`
    SELECT r.*, si.quantity AS issuedQuantity, si.returnedQuantity, i.itemName, i.unit
    FROM store_returns r
    JOIN store_stock_issues si ON si.id = r.stockIssueId
    JOIN store_items i ON i.id = r.itemId
    WHERE r.id = ${returnId}
      AND r.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR r.branch_id = ${branchId})
      AND si.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR si.branch_id = ${branchId})
      AND i.tenant_id = ${tenantId}
      AND r.status = 'active'
    LIMIT 1
  `;
  if (!rows.length) throw new AppError('واپسی ریکارڈ نہیں ملا۔', 404);
  return mapStoreReturn(rows[0]);
};

const mapDamagedStock = (item) => ({
  ...item,
  id: Number(item.id),
  returnId: item.returnId === null || item.returnId === undefined ? null : Number(item.returnId),
  itemId: Number(item.itemId),
  quantity: toAmount(item.quantity),
  amountLoss: toAmount(item.amountLoss),
  currentStock: item.currentStock === undefined ? undefined : toAmount(item.currentStock),
  purchasePrice: item.purchasePrice === undefined ? undefined : toAmount(item.purchasePrice),
});

const normalizeDamageDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError('تاریخ درست درج کریں۔', 400);
  date.setHours(0, 0, 0, 0);
  return date;
};

const validateDamagedStockPayload = (payload) => {
  const itemId = normalizeId(payload.itemId);
  const quantity = normalizeNumber(payload.quantity, 'مقدار');
  if (quantity <= 0) throw new AppError('مقدار صفر سے زیادہ ہونی چاہیے۔', 400);

  const reason = normalizeText(payload.reason);
  if (!reason) throw new AppError('وجہ درج کرنا ضروری ہے۔', 400);

  return {
    itemId,
    quantity,
    reason,
    date: normalizeDamageDate(payload.date),
    responsiblePerson: normalizeText(payload.responsiblePerson) || null,
    note: normalizeText(payload.note) || null,
  };
};

const getDamagedStockRows = async (tenantId, id, branchId = null) => {
  const damagedId = normalizeId(id);
  const rows = await prisma.$queryRaw`
    SELECT ds.*, i.itemName, i.unit, i.currentStock, i.purchasePrice
    FROM store_damaged_stock ds
    JOIN store_items i ON i.id = ds.itemId
    WHERE ds.id = ${damagedId}
      AND ds.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR ds.branch_id = ${branchId})
      AND i.tenant_id = ${tenantId}
      AND ds.status = 'active'
    LIMIT 1
  `;
  if (!rows.length) throw new AppError('خراب یا گم شدہ اسٹاک ریکارڈ نہیں ملا۔', 404);
  return mapDamagedStock(rows[0]);
};

const mapStockAdjustment = (adjustment) => ({
  ...adjustment,
  id: Number(adjustment.id),
  itemId: Number(adjustment.itemId),
  quantity: toAmount(adjustment.quantity),
  previousStock: toAmount(adjustment.previousStock),
  adjustedStock: toAmount(adjustment.adjustedStock),
  currentStock: adjustment.currentStock === undefined ? undefined : toAmount(adjustment.currentStock),
});

const getStockAdjustmentRows = async (tenantId, id, branchId = null) => {
  const adjustmentId = normalizeId(id);
  const rows = await prisma.$queryRaw`
    SELECT sa.*, i.itemName, i.unit, i.currentStock
    FROM store_stock_adjustments sa
    JOIN store_items i ON i.id = sa.itemId
    WHERE sa.id = ${adjustmentId}
      AND sa.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR sa.branch_id = ${branchId})
      AND i.tenant_id = ${tenantId}
      AND sa.status = 'active'
    LIMIT 1
  `;
  if (!rows.length) throw new AppError('اسٹاک ایڈجسٹمنٹ ریکارڈ نہیں ملا۔', 404);
  return mapStockAdjustment(rows[0]);
};

const getReportDateRange = (query = {}) => {
  const fromDate = query.fromDate ? new Date(query.fromDate) : null;
  const toDate = query.toDate ? new Date(query.toDate) : null;

  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
};

const reportNumber = (value) => toAmount(value);

const getBranchStockQuantitySql = (tenantId, branchId) => {
  if (!branchId) return Prisma.sql`i.currentStock`;

  return Prisma.sql`
    (
      COALESCE((
        SELECT SUM(pi.quantity)
        FROM store_purchase_items pi
        JOIN store_purchases p ON p.id = pi.purchaseId
        WHERE pi.itemId = i.id
          AND pi.tenant_id = ${tenantId}
          AND p.tenant_id = ${tenantId}
          AND pi.branch_id = ${branchId}
          AND p.branch_id = ${branchId}
          AND p.status = 'active'
          AND p.approvalStatus = 'approved'
      ), 0)
      - COALESCE((
        SELECT SUM(si.quantity)
        FROM store_stock_issues si
        WHERE si.itemId = i.id
          AND si.tenant_id = ${tenantId}
          AND si.branch_id = ${branchId}
          AND si.status = 'active'
          AND si.approvalStatus = 'approved'
      ), 0)
      + COALESCE((
        SELECT SUM(r.returnQuantity)
        FROM store_returns r
        WHERE r.itemId = i.id
          AND r.tenant_id = ${tenantId}
          AND r.branch_id = ${branchId}
          AND r.status = 'active'
          AND r.condition = 'good'
          AND r.addToStock = true
      ), 0)
      - COALESCE((
        SELECT SUM(ds.quantity)
        FROM store_damaged_stock ds
        WHERE ds.itemId = i.id
          AND ds.tenant_id = ${tenantId}
          AND ds.branch_id = ${branchId}
          AND ds.status = 'active'
          AND ds.approvalStatus = 'approved'
          AND ds.returnId IS NULL
      ), 0)
      + COALESCE((
        SELECT SUM(sa.adjustedStock - sa.previousStock)
        FROM store_stock_adjustments sa
        WHERE sa.itemId = i.id
          AND sa.tenant_id = ${tenantId}
          AND sa.branch_id = ${branchId}
          AND sa.status = 'active'
          AND sa.approvalStatus = 'approved'
      ), 0)
    )
  `;
};

const mapReportRows = (rows) =>
  rows.map((row) => {
    const nextRow = { ...row };
    for (const key of Object.keys(nextRow)) {
      if (typeof nextRow[key] === 'bigint') nextRow[key] = Number(nextRow[key]);
      if (['quantity', 'currentStock', 'purchasePrice', 'totalAmount', 'paidAmount', 'remainingAmount', 'amountLoss', 'stockValue', 'totalValue', 'totalQuantity', 'inQuantity', 'outQuantity', 'balanceQuantity'].includes(key)) {
        nextRow[key] = reportNumber(nextRow[key]);
      }
    }
    return nextRow;
  });

const getFinanceHeadId = async (tx, tenantId, headName = 'Store Purchase', description = 'Store purchase expense') => {
  const existing = await tx.$queryRaw`SELECT id FROM finance_heads WHERE tenant_id = ${tenantId} AND name = ${headName} LIMIT 1`;
  if (existing.length) return Number(existing[0].id);

  await tx.$executeRaw`
    INSERT INTO finance_heads (tenant_id, name, type, description, status, createdAt, updatedAt)
    VALUES (${tenantId}, ${headName}, 'expense', ${description}, 'active', ${new Date()}, ${new Date()})
  `;
  const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
  return Number(rows[0].id);
};

const upsertStoreFinanceExpense = async (tx, data) => {
  const financeHeadId = await getFinanceHeadId(tx, data.tenantId, data.category, data.note);
  const now = new Date();
  const existing = await tx.$queryRaw`
    SELECT id
    FROM finance_transactions
    WHERE tenant_id = ${data.tenantId} AND referenceType = ${data.referenceType} AND referenceId = ${data.referenceId}
      AND (${data.branchId || null} IS NULL OR branch_id = ${data.branchId || null})
    LIMIT 1
  `;

  if (existing.length) {
    const transactionId = Number(existing[0].id);
    await tx.$executeRaw`
      UPDATE finance_transactions
      SET financeHeadId = ${financeHeadId},
          branch_id = ${data.branchId || null},
          type = 'expense',
          amount = ${data.amount},
          transactionDate = ${data.date},
          paymentMode = ${data.paymentMethod},
          paymentStatus = ${data.paymentStatus || 'مکمل'},
          slipNo = ${data.slipNo || null},
          details = ${data.title},
          status = 'active',
          updatedAt = ${now}
      WHERE id = ${transactionId} AND tenant_id = ${data.tenantId}
    `;
    return transactionId;
  }

  await tx.$executeRaw`
    INSERT INTO finance_transactions (tenant_id, branch_id, financeHeadId, type, amount, transactionDate, paymentMode, paymentStatus, slipNo, details, referenceType, referenceId, status, createdAt, updatedAt)
    VALUES (${data.tenantId}, ${data.branchId || null}, ${financeHeadId}, 'expense', ${data.amount}, ${data.date}, ${data.paymentMethod}, ${data.paymentStatus || 'مکمل'}, ${data.slipNo || null}, ${data.title}, ${data.referenceType}, ${data.referenceId}, 'active', ${now}, ${now})
  `;
  const financeRows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
  return Number(financeRows[0].id);
};

const createPurchaseFinanceTransaction = async (tx, tenantId, purchaseId, data, branchId = null) =>
  upsertStoreFinanceExpense(tx, {
    tenantId,
    branchId,
    title: `خریداری${data.invoiceNumber ? ` - ${data.invoiceNumber}` : ''}`,
    category: 'خریداری',
    amount: data.totalAmount,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.remainingAmount > 0 ? 'جزوی' : 'مکمل',
    slipNo: data.invoiceNumber,
    referenceType: 'store_purchase',
    referenceId: purchaseId,
    date: data.purchaseDate,
    note: 'اسٹور خریداری کا خرچ',
  });

const createSupplierPaymentFinanceTransaction = async (tx, tenantId, supplierId, paymentId, data, branchId = null) =>
  upsertStoreFinanceExpense(tx, {
    tenantId,
    branchId,
    title: `Store supplier payment - ${supplierId}`,
    category: 'Store Supplier Payment',
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    paymentStatus: 'مکمل',
    referenceType: 'store_supplier_payment',
    referenceId: paymentId,
    date: data.paymentDate,
    note: data.note || 'Store supplier payment',
  });

const getApproverName = (admin) => normalizeText(admin?.name) || normalizeText(admin?.username) || normalizeText(admin?.email) || null;

const normalizeApprovalModule = (moduleType) => {
  const value = normalizeText(moduleType).toLowerCase();
  const modules = {
    purchase: 'purchase',
    purchases: 'purchase',
    'stock-out': 'stock-out',
    stockout: 'stock-out',
    'stock-issue': 'stock-out',
    'stock-issues': 'stock-out',
    damage: 'damage',
    damaged: 'damage',
    'damaged-stock': 'damage',
    adjustment: 'adjustment',
    adjustments: 'adjustment',
    'stock-adjustment': 'adjustment',
    'stock-adjustments': 'adjustment',
  };
  const normalized = modules[value];
  if (!normalized) throw new AppError('منظوری کی قسم درست نہیں ہے۔', 400);
  return normalized;
};

const createApprovalLog = async (tx, { tenantId, moduleType, recordId, status, approvedBy, remarks }) => {
  await tx.$executeRaw`
    INSERT INTO store_approval_logs (tenant_id, moduleType, recordId, status, approvedBy, remarks, createdAt)
    VALUES (${tenantId}, ${moduleType}, ${recordId}, ${status}, ${approvedBy}, ${remarks}, ${new Date()})
  `;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '-');
const formatAmount = (value) => new Intl.NumberFormat('ur-PK', { maximumFractionDigits: 2 }).format(toAmount(value));

const getMadrassaPrintProfile = async (tenantId, admin) => {
  const adminId = Number(admin?.id || 0);
  const profileRows = await prisma.$queryRaw`
    SELECT name, branch, city, address, logoUrl
    FROM madrassa_profiles
    WHERE tenant_id = ${tenantId}
      AND status = 'active'
    ORDER BY CASE WHEN adminId = ${adminId} THEN 0 ELSE 1 END, id DESC
    LIMIT 1
  `;

  if (profileRows[0]) return profileRows[0];

  const tenantRows = await prisma.$queryRaw`
    SELECT name
    FROM tenant
    WHERE id = ${tenantId}
    LIMIT 1
  `;

  return {
    name: tenantRows[0]?.name || 'مدرسہ',
    branch: '',
    city: '',
    address: '',
    logoUrl: '',
  };
};

const buildCsv = (columns, rows) => {
  const escapeCsv = (value) => `"${String(value ?? '-').replace(/"/g, '""')}"`;
  return [
    columns.map((column) => escapeCsv(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(',')),
  ].join('\r\n');
};

const buildPrintHtml = ({ profile, title, subtitle = '', columns = [], rows = [], summary = '', footerNote = '' }) => `
<!doctype html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @font-face {
      font-family: "Jameel Noori Nastaleeq";
      src: url("/fonts/JameelNooriNastaleeq.ttf") format("truetype");
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
    body { margin: 0; background: #f8fafc; color: #111827; font-family: "Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Noto Naskh Arabic", "Urdu Typesetting", "Segoe UI", Tahoma, Arial, sans-serif; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 18mm; box-sizing: border-box; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #00d094; padding-bottom: 14px; gap: 18px; }
    .brand { text-align: center; flex: 1; }
    .brand h1 { margin: 0; font-size: 30px; font-weight: 900; }
    .brand p { margin: 4px 0 0; font-size: 14px; color: #475569; }
    .logo { width: 70px; height: 70px; object-fit: contain; }
    .meta { font-size: 13px; color: #334155; line-height: 1.9; min-width: 120px; }
    .title { margin: 22px 0 14px; text-align: center; }
    .title h2 { display: inline-block; margin: 0; border: 1px solid #00d094; border-radius: 999px; padding: 8px 26px; font-size: 21px; }
    .title p { margin: 8px 0 0; color: #64748b; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th { background: #ecfdf5; color: #065f46; font-weight: 900; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; vertical-align: top; }
    .summary { margin-top: 14px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 800; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 52px; text-align: center; }
    .signatures div { border-top: 1px solid #334155; padding-top: 8px; font-size: 13px; }
    .footer { margin-top: 28px; text-align: center; color: #64748b; font-size: 12px; }
    @media print { body { background: #fff; } .page { margin: 0; width: auto; min-height: auto; box-shadow: none; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="meta">تاریخ: ${escapeHtml(formatDate(new Date()))}<br />وقت: ${escapeHtml(new Date().toLocaleTimeString('ur-PK'))}</div>
      <div class="brand">
        <h1>${escapeHtml(profile.name)}</h1>
        <p>${escapeHtml([profile.branch, profile.city, profile.address].filter(Boolean).join(' - '))}</p>
      </div>
      ${profile.logoUrl ? `<img class="logo" src="${escapeHtml(profile.logoUrl)}" alt="لوگو" />` : '<div class="logo"></div>'}
    </header>
    <section class="title"><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</section>
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.length ? rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns.length}">کوئی ریکارڈ موجود نہیں۔</td></tr>`}</tbody>
    </table>
    ${summary ? `<div class="summary">${summary}</div>` : ''}
    <section class="signatures"><div>تیار کرنے والے کے دستخط</div><div>منظور کرنے والے کے دستخط</div><div>وصول کنندہ کے دستخط</div></section>
    <footer class="footer">${escapeHtml(footerNote || 'یہ دستاویز سسٹم سے خودکار طور پر تیار ہوئی ہے۔')}</footer>
  </main>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 300); });</script>
</body>
</html>`;

const purchaseExportColumns = [
  { label: 'تاریخ', value: (row) => formatDate(row.purchaseDate) },
  { label: 'سپلائر', value: (row) => row.supplierName || '-' },
  { label: 'انوائس', value: (row) => row.invoiceNumber || '-' },
  { label: 'کل رقم', value: (row) => formatAmount(row.totalAmount) },
  { label: 'ادا شدہ', value: (row) => formatAmount(row.paidAmount) },
  { label: 'باقی', value: (row) => formatAmount(row.remainingAmount) },
  { label: 'ادائیگی طریقہ', value: (row) => row.paymentMethod || '-' },
  { label: 'حالت', value: (row) => row.approvalStatus || '-' },
];

const stockExportColumns = [
  { label: 'شے', value: (row) => row.itemName || '-' },
  { label: 'کیٹیگری', value: (row) => row.category || '-' },
  { label: 'اکائی', value: (row) => row.unit || '-' },
  { label: 'موجودہ اسٹاک', value: (row) => formatAmount(row.currentStock) },
  { label: 'فی اکائی قیمت', value: (row) => `روپے ${formatAmount(row.purchasePrice)}${row.unit ? ` فی ${row.unit}` : ''}` },
  { label: 'مالیت', value: (row) => formatAmount(row.stockValue || row.currentStock * row.purchasePrice) },
];

const getOrCreateSupplier = async (tx, tenantId, payload) => {
  const supplierId = payload.supplierId ? normalizeId(payload.supplierId) : null;
  if (supplierId) {
    const rows = await tx.$queryRaw`SELECT id, tenant_id AS tenantId, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt FROM store_suppliers WHERE id = ${supplierId} AND tenant_id = ${tenantId} AND status = 'active' LIMIT 1`;
    if (!rows.length) throw new AppError('سپلائر نہیں ملا۔', 404);
    return mapSupplier(rows[0]);
  }

  const supplierName = normalizeText(payload.supplierName);
  if (!supplierName) throw new AppError('سپلائر منتخب یا درج کرنا ضروری ہے۔', 400);
  const existing = await tx.$queryRaw`SELECT id, tenant_id AS tenantId, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt FROM store_suppliers WHERE tenant_id = ${tenantId} AND supplierName = ${supplierName} LIMIT 1`;
  if (existing.length) return mapSupplier(existing[0]);

  await tx.$executeRaw`
    INSERT INTO store_suppliers (tenant_id, supplierName, balance, status, createdAt, updatedAt)
    VALUES (${tenantId}, ${supplierName}, 0, 'active', ${new Date()}, ${new Date()})
  `;
  const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
  const supplierRows = await tx.$queryRaw`SELECT id, tenant_id AS tenantId, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt FROM store_suppliers WHERE id = ${Number(rows[0].id)} AND tenant_id = ${tenantId} LIMIT 1`;
  return mapSupplier(supplierRows[0]);
};

const getPurchaseRows = async (tenantId, id, branchId = null) => {
  const purchaseId = normalizeId(id);
  const purchaseRows = await prisma.$queryRaw`
    SELECT p.*, s.supplierName, s.balance AS supplierBalance
    FROM store_purchases p
    JOIN store_suppliers s ON s.id = p.supplierId
    WHERE p.id = ${purchaseId}
      AND p.tenant_id = ${tenantId}
      AND s.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR p.branch_id = ${branchId})
      AND p.status = 'active'
    LIMIT 1
  `;
  if (!purchaseRows.length) throw new AppError('خریداری ریکارڈ نہیں ملا۔', 404);

  const itemRows = await prisma.$queryRaw`
    SELECT pi.*, i.itemName, i.unit, i.itemCode, u.name AS unitName, u.shortName AS unitShortName
    FROM store_purchase_items pi
    JOIN store_items i ON i.id = pi.itemId
    LEFT JOIN store_units u ON u.id = pi.unitId AND u.tenant_id = ${tenantId}
    WHERE pi.purchaseId = ${purchaseId}
      AND pi.tenant_id = ${tenantId}
      AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
      AND i.tenant_id = ${tenantId}
    ORDER BY pi.id ASC
  `;

  return mapPurchase(purchaseRows[0], itemRows);
};

const applyStockChange = async (tx, tenantId, purchaseItems, multiplier) => {
  for (const item of purchaseItems) {
    const itemRows = await tx.$queryRaw`SELECT id FROM store_items WHERE id = ${item.itemId} AND tenant_id = ${tenantId} AND status = 'active' LIMIT 1`;
    if (!itemRows.length) throw new AppError('منتخب شے نہیں ملی۔', 404);

    await tx.$executeRaw`
      UPDATE store_items
      SET currentStock = currentStock + ${item.quantity * multiplier}, updatedAt = ${new Date()}
      WHERE id = ${item.itemId} AND tenant_id = ${tenantId}
    `;
  }
};

const validatePurchasePayload = async (tenantId, payload) => {
  const items = await parseItemsPayload(tenantId, payload.items);
  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
  const paidAmount = normalizeNumber(payload.paidAmount, 'ادا شدہ رقم');
  if (paidAmount > totalAmount) throw new AppError('ادا شدہ رقم کل رقم سے زیادہ نہیں ہو سکتی۔', 400);

  return {
    purchaseDate: normalizePurchaseDate(payload.purchaseDate),
    invoiceNumber: normalizeText(payload.invoiceNumber) || null,
    paymentMethod: normalizeText(payload.paymentMethod) || null,
    approvalStatus: normalizeApprovalStatus(payload.approvalStatus),
    paidAmount,
    totalAmount,
    remainingAmount: Math.max(totalAmount - paidAmount, 0),
    items,
  };
};

const ensureUniqueItemCode = async (tenantId, itemCode, ignoredId = null) => {
  const rows = ignoredId
    ? await prisma.$queryRaw`SELECT id FROM store_items WHERE tenant_id = ${tenantId} AND itemCode = ${itemCode} AND id <> ${ignoredId} LIMIT 1`
    : await prisma.$queryRaw`SELECT id FROM store_items WHERE tenant_id = ${tenantId} AND itemCode = ${itemCode} LIMIT 1`;

  if (rows.length) {
    throw new AppError('یہ آئٹم کوڈ پہلے سے موجود ہے۔', 409);
  }
};

const ensureActiveStoreCategory = async (tenantId, categoryName) => {
  await ensureStoreCategoriesTable();
  const rows = await prisma.$queryRaw`
    SELECT id, name, status
    FROM store_categories
    WHERE tenant_id = ${tenantId} AND name = ${categoryName}
    LIMIT 1
  `;

  if (!rows.length) throw new AppError('کیٹیگری نہیں ملی۔', 404);
  if (rows[0].status !== 'active') throw new AppError('غیر فعال کیٹیگری میں نئی شے نہیں بنائی جا سکتی۔', 400);
  return rows[0];
};

const ensureUniqueItemNameInCategory = async (tenantId, itemName, categoryName, ignoredId = null) => {
  const rows = ignoredId
    ? await prisma.$queryRaw`
      SELECT id
      FROM store_items
      WHERE tenant_id = ${tenantId} AND itemName = ${itemName} AND category = ${categoryName} AND id <> ${ignoredId}
      LIMIT 1
    `
    : await prisma.$queryRaw`
      SELECT id
      FROM store_items
      WHERE tenant_id = ${tenantId} AND itemName = ${itemName} AND category = ${categoryName}
      LIMIT 1
    `;

  if (rows.length) throw new AppError('اسی کیٹیگری میں یہ شے پہلے سے موجود ہے۔', 409);
};

const getDefaultStoreUnit = async (tenantId) => {
  await ensureDefaultStoreUnitsForTenant(tenantId);
  const rows = await prisma.$queryRaw`
    SELECT shortName
    FROM store_units
    WHERE tenant_id = ${tenantId} AND status = 'active'
    ORDER BY id ASC
    LIMIT 1
  `;
  return rows[0]?.shortName || 'piece';
};

const generateItemCode = async (tenantId) => {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const rows = await prisma.$queryRaw`SELECT id FROM store_items WHERE tenant_id = ${tenantId} AND itemCode = ${code} LIMIT 1`;
    isUnique = rows.length === 0;
  }
  return code;
};

const getItemDependencyCount = async (tenantId, itemId) => {
  await ensureStorePurchaseTables();
  const [purchaseItems, stockIssues, returns, damagedStocks, stockAdjustments] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_purchase_items WHERE tenant_id = ${tenantId} AND itemId = ${itemId}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_stock_issues WHERE tenant_id = ${tenantId} AND itemId = ${itemId}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_returns WHERE tenant_id = ${tenantId} AND itemId = ${itemId}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_damaged_stock WHERE tenant_id = ${tenantId} AND itemId = ${itemId}`,
    prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_stock_adjustments WHERE tenant_id = ${tenantId} AND itemId = ${itemId}`,
  ]);

  return [
    purchaseItems,
    stockIssues,
    returns,
    damagedStocks,
    stockAdjustments,
  ].reduce((total, rows) => total + Number(rows?.[0]?.total || 0), 0);
};

export const storeService = {
  async getDashboard(tenantId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStoreItemsTable();
    const { startDate, endDate } = getCurrentMonthRange();

    const [totalItems, purchaseTotal, monthlyExpense] = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) AS total FROM store_items WHERE tenant_id = ${resolvedTenantId} AND status = 'active'`,
      prisma.$queryRaw`SELECT COALESCE(SUM(totalAmount), 0) AS total FROM store_purchases WHERE tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active' AND purchaseDate >= ${startDate} AND purchaseDate < ${endDate}`,
      this.getMonthlyExpense(resolvedTenantId, { startDate, endDate }, branchScope),
    ]);

    return {
      totalItems: Number(totalItems?.[0]?.total || 0),
      monthlyPurchase: toAmount(purchaseTotal?.[0]?.total),
      monthlyExpense: monthlyExpense.total,
    };
  },

  async getMonthlyExpense(tenantId, range = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const { startDate, endDate } = range.startDate && range.endDate ? range : getCurrentMonthRange();
    const rows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(ft.amount), 0) AS total
      FROM finance_transactions ft
      JOIN finance_heads fh ON fh.id = ft.financeHeadId
      WHERE ft.status = 'active'
        AND ft.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ft.branch_id = ${branchId})
        AND fh.tenant_id = ${resolvedTenantId}
        AND ft.type = 'expense'
        AND ft.transactionDate >= ${startDate}
        AND ft.transactionDate < ${endDate}
        AND fh.name IN ('Store Purchase', 'Store Supplier Payment')
    `;

    return { total: toAmount(rows?.[0]?.total), startDate, endDate };
  },

  async getUnits(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreUnitsTable();
    const search = normalizeText(query.search);
    const activeOnly = query.activeOnly === true || query.activeOnly === 'true';
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT id, name, shortName, description, status, createdAt, updatedAt
      FROM store_units
      WHERE tenant_id = ${resolvedTenantId}
        AND (${activeOnly} = false OR status = 'active')
        AND (${search} = '' OR name LIKE ${searchTerm} OR shortName LIKE ${searchTerm})
      ORDER BY name ASC
    `;

    return { items: rows.map(mapStoreUnit), meta: null };
  },

  async getUnitById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreUnitsTable();
    const unitId = normalizeId(id);
    const rows = await prisma.$queryRaw`
      SELECT id, name, shortName, description, status, createdAt, updatedAt
      FROM store_units
      WHERE id = ${unitId} AND tenant_id = ${resolvedTenantId}
      LIMIT 1
    `;
    if (!rows.length) throw new AppError('اکائی نہیں ملی۔', 404);
    return mapStoreUnit(rows[0]);
  },

  async createUnit(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreUnitsTable();
    const data = validateUnitPayload(payload);
    const duplicate = await prisma.$queryRaw`SELECT id FROM store_units WHERE tenant_id = ${resolvedTenantId} AND shortName = ${data.shortName} LIMIT 1`;
    if (duplicate.length) throw new AppError('یہ مختصر نام پہلے سے موجود ہے۔', 409);
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO store_units (tenant_id, name, shortName, description, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${data.name}, ${data.shortName}, ${data.description}, ${data.status}, ${now}, ${now})
    `;
    const rows = await prisma.$queryRaw`
      SELECT id, name, shortName, description, status, createdAt, updatedAt
      FROM store_units
      WHERE tenant_id = ${resolvedTenantId} AND shortName = ${data.shortName}
      LIMIT 1
    `;
    return mapStoreUnit(rows[0]);
  },

  async updateUnit(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreUnitsTable();
    const unitId = normalizeId(id);
    await this.getUnitById(resolvedTenantId, unitId);
    const data = validateUnitPayload(payload);
    const duplicate = await prisma.$queryRaw`SELECT id FROM store_units WHERE tenant_id = ${resolvedTenantId} AND shortName = ${data.shortName} AND id <> ${unitId} LIMIT 1`;
    if (duplicate.length) throw new AppError('یہ مختصر نام پہلے سے موجود ہے۔', 409);

    await prisma.$executeRaw`
      UPDATE store_units
      SET name = ${data.name},
          shortName = ${data.shortName},
          description = ${data.description},
          status = ${data.status},
          updatedAt = ${new Date()}
      WHERE id = ${unitId} AND tenant_id = ${resolvedTenantId}
    `;
    return this.getUnitById(resolvedTenantId, unitId);
  },

  async deleteUnit(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreUnitsTable();
    const unitId = normalizeId(id);
    const unit = await this.getUnitById(resolvedTenantId, unitId);
    await ensureStoreItemsTable();

    const linkedItems = await prisma.$queryRaw`
      SELECT id
      FROM store_items
      WHERE tenant_id = ${resolvedTenantId} AND unit = ${unit.name}
      LIMIT 1
    `;

    if (linkedItems.length) {
      throw new AppError('یہ اکائی اشیاء میں استعمال ہو رہی ہے، پہلے متعلقہ اشیاء تبدیل یا حذف کریں۔', 400);
    }

    await prisma.$executeRaw`
      DELETE FROM store_units
      WHERE id = ${unitId} AND tenant_id = ${resolvedTenantId}
    `;
    return { id: unitId };
  },

  async getCategories(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreCategoriesTable();
    const search = normalizeText(query.search);
    const activeOnly = query.activeOnly === true || query.activeOnly === 'true';
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT id, name, description, status, createdAt, updatedAt
      FROM store_categories
      WHERE tenant_id = ${resolvedTenantId}
        AND (${activeOnly} = false OR status = 'active')
        AND (${search} = '' OR name LIKE ${searchTerm})
      ORDER BY name ASC
    `;

    return { items: rows.map(mapStoreCategory), meta: null };
  },

  async getCategoryById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreCategoriesTable();
    const categoryId = normalizeId(id);
    const rows = await prisma.$queryRaw`
      SELECT id, name, description, status, createdAt, updatedAt
      FROM store_categories
      WHERE id = ${categoryId} AND tenant_id = ${resolvedTenantId}
      LIMIT 1
    `;
    if (!rows.length) throw new AppError('کیٹیگری نہیں ملی۔', 404);
    return mapStoreCategory(rows[0]);
  },

  async createCategory(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreCategoriesTable();
    const data = validateCategoryPayload(payload);
    const duplicate = await prisma.$queryRaw`SELECT id FROM store_categories WHERE tenant_id = ${resolvedTenantId} AND name = ${data.name} LIMIT 1`;
    if (duplicate.length) throw new AppError('یہ کیٹیگری پہلے سے موجود ہے۔', 409);
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO store_categories (tenant_id, name, description, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${data.name}, ${data.description}, ${data.status}, ${now}, ${now})
    `;
    const rows = await prisma.$queryRaw`
      SELECT id, name, description, status, createdAt, updatedAt
      FROM store_categories
      WHERE tenant_id = ${resolvedTenantId} AND name = ${data.name}
      LIMIT 1
    `;
    return mapStoreCategory(rows[0]);
  },

  async updateCategory(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreCategoriesTable();
    const categoryId = normalizeId(id);
    await this.getCategoryById(resolvedTenantId, categoryId);
    const data = validateCategoryPayload(payload);
    const duplicate = await prisma.$queryRaw`SELECT id FROM store_categories WHERE tenant_id = ${resolvedTenantId} AND name = ${data.name} AND id <> ${categoryId} LIMIT 1`;
    if (duplicate.length) throw new AppError('یہ کیٹیگری پہلے سے موجود ہے۔', 409);

    await prisma.$executeRaw`
      UPDATE store_categories
      SET name = ${data.name},
          description = ${data.description},
          status = ${data.status},
          updatedAt = ${new Date()}
      WHERE id = ${categoryId} AND tenant_id = ${resolvedTenantId}
    `;
    return this.getCategoryById(resolvedTenantId, categoryId);
  },

  async deleteCategory(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreCategoriesTable();
    const categoryId = normalizeId(id);
    const category = await this.getCategoryById(resolvedTenantId, categoryId);
    await ensureStoreItemsTable();

    const linkedItems = await prisma.$queryRaw`
      SELECT id
      FROM store_items
      WHERE tenant_id = ${resolvedTenantId} AND category = ${category.name}
      LIMIT 1
    `;

    if (linkedItems.length) {
      throw new AppError('یہ کیٹیگری اشیاء میں استعمال ہو رہی ہے، پہلے متعلقہ اشیاء تبدیل یا حذف کریں۔', 400);
    }

    await prisma.$executeRaw`
      DELETE FROM store_categories
      WHERE id = ${categoryId} AND tenant_id = ${resolvedTenantId}
    `;
    return { id: categoryId };
  },

  async getItems(tenantId, query = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreItemsTable();
    await ensureStoreItemDescriptionColumn();
    const search = normalizeText(query.search);
    const category = normalizeText(query.category);
    const status = normalizeText(query.status);
    const includeInactive = query.includeInactive === true || query.includeInactive === 'true';
    const lowStockOnly = query.lowStock === true || query.lowStock === 'true';
    const outOfStockOnly = query.outOfStock === true || query.outOfStock === 'true';
    const lowStockThreshold = Number(query.lowStockThreshold || 5);
    const searchTerm = `%${search}%`;

    const rows = await prisma.$queryRaw`
      SELECT id, itemName, category, description, unit, itemCode, currentStock, purchasePrice, status, createdAt, updatedAt
      FROM store_items
      WHERE tenant_id = ${resolvedTenantId}
        AND (${includeInactive} = true OR status = 'active')
        AND (${status} = '' OR status = ${status})
        AND (${search} = '' OR itemName LIKE ${searchTerm} OR itemCode LIKE ${searchTerm})
        AND (${category} = '' OR category = ${category})
        AND (${lowStockOnly} = false OR (currentStock > 0 AND currentStock <= ${Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5}))
        AND (${outOfStockOnly} = false OR currentStock <= 0)
      ORDER BY createdAt DESC
    `;

    return { items: rows.map(mapItem), meta: null };
  },

  async getItemById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreItemsTable();
    await ensureStoreItemDescriptionColumn();
    const itemId = normalizeId(id);
    const rows = await prisma.$queryRaw`
      SELECT id, itemName, category, description, unit, itemCode, currentStock, purchasePrice, status, createdAt, updatedAt
      FROM store_items
      WHERE id = ${itemId} AND tenant_id = ${resolvedTenantId}
      LIMIT 1
    `;

    if (!rows.length) throw new AppError('شے نہیں ملی۔', 404);
    return mapItem(rows[0]);
  },

  async createItem(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStoreItemDescriptionColumn();
    const data = validateItemPayload(payload);
    await ensureActiveStoreCategory(resolvedTenantId, data.category);
    await ensureUniqueItemNameInCategory(resolvedTenantId, data.itemName, data.category);
    data.unit = data.unit || await getDefaultStoreUnit(resolvedTenantId);
    data.itemCode = data.itemCode || await generateItemCode(resolvedTenantId);
    await ensureUniqueItemCode(resolvedTenantId, data.itemCode);
    const now = new Date();
    const columnSet = await getStoreItemColumnSet();

    if (columnSet.has('barcode') || columnSet.has('openingStock')) {
      await prisma.$executeRaw`
        INSERT INTO store_items (tenant_id, itemName, category, description, unit, itemCode, barcode, openingStock, currentStock, purchasePrice, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${data.itemName}, ${data.category}, ${data.description}, ${data.unit}, ${data.itemCode}, NULL, ${data.quantity}, ${data.quantity}, ${data.purchasePrice}, ${data.status}, ${now}, ${now})
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO store_items (tenant_id, itemName, category, description, unit, itemCode, currentStock, purchasePrice, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${data.itemName}, ${data.category}, ${data.description}, ${data.unit}, ${data.itemCode}, ${data.quantity}, ${data.purchasePrice}, ${data.status}, ${now}, ${now})
      `;
    }

    const rows = await prisma.$queryRaw`
      SELECT id, itemName, category, description, unit, itemCode, currentStock, purchasePrice, status, createdAt, updatedAt
      FROM store_items
      WHERE tenant_id = ${resolvedTenantId} AND itemCode = ${data.itemCode}
      LIMIT 1
    `;

    return mapItem(rows[0]);
  },

  async updateItem(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const itemId = normalizeId(id);
    await ensureStoreItemDescriptionColumn();
    const existingItem = await this.getItemById(resolvedTenantId, itemId);
    const data = validateItemPayload(payload);
    await ensureActiveStoreCategory(resolvedTenantId, data.category);
    await ensureUniqueItemNameInCategory(resolvedTenantId, data.itemName, data.category, itemId);
    data.unit = data.unit || existingItem.unit || await getDefaultStoreUnit(resolvedTenantId);
    data.itemCode = data.itemCode || existingItem.itemCode || await generateItemCode(resolvedTenantId);
    data.quantity = payload.quantity === undefined || payload.quantity === null || payload.quantity === '' ? existingItem.currentStock : data.quantity;
    data.purchasePrice = payload.purchasePrice === undefined || payload.purchasePrice === null || payload.purchasePrice === '' ? existingItem.purchasePrice : data.purchasePrice;
    await ensureUniqueItemCode(resolvedTenantId, data.itemCode, itemId);
    const columnSet = await getStoreItemColumnSet();

    if (columnSet.has('barcode') || columnSet.has('openingStock')) {
      await prisma.$executeRaw`
        UPDATE store_items
        SET itemName = ${data.itemName},
            category = ${data.category},
            description = ${data.description},
            unit = ${data.unit},
            itemCode = ${data.itemCode},
            barcode = NULL,
            openingStock = ${data.quantity},
            currentStock = ${data.quantity},
            purchasePrice = ${data.purchasePrice},
            status = ${data.status},
            updatedAt = ${new Date()}
        WHERE id = ${itemId} AND tenant_id = ${resolvedTenantId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE store_items
        SET itemName = ${data.itemName},
            category = ${data.category},
            description = ${data.description},
            unit = ${data.unit},
            itemCode = ${data.itemCode},
            currentStock = ${data.quantity},
            purchasePrice = ${data.purchasePrice},
            status = ${data.status},
            updatedAt = ${new Date()}
        WHERE id = ${itemId} AND tenant_id = ${resolvedTenantId}
      `;
    }

    return this.getItemById(resolvedTenantId, itemId);
  },

  async deleteItem(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const itemId = normalizeId(id);
    await this.getItemById(resolvedTenantId, itemId);
    const dependencyCount = await getItemDependencyCount(resolvedTenantId, itemId);

    await prisma.$executeRaw`
      UPDATE store_items
      SET status = 'inactive', updatedAt = ${new Date()}
      WHERE id = ${itemId} AND tenant_id = ${resolvedTenantId}
    `;

    return { id: itemId, deleted: false, softDeleted: true, dependencyCount };
  },

  async getSuppliers(tenantId) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const rows = await prisma.$queryRaw`
      SELECT id, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt
      FROM store_suppliers
      WHERE tenant_id = ${resolvedTenantId} AND status = 'active'
      ORDER BY supplierName ASC
    `;
    return { items: rows.map(mapSupplier), meta: null };
  },

  async getSupplierById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    const rows = await prisma.$queryRaw`
      SELECT id, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt
      FROM store_suppliers
      WHERE id = ${supplierId} AND tenant_id = ${resolvedTenantId} AND status = 'active'
      LIMIT 1
    `;
    if (!rows.length) throw new AppError('سپلائر نہیں ملا۔', 404);
    return mapSupplier(rows[0]);
  },

  async createSupplier(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const data = validateSupplierPayload(payload);
    await ensureUniqueSupplierName(resolvedTenantId, data.supplierName);
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO store_suppliers (tenant_id, supplierName, mobileNumber, address, shopName, balance, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${data.supplierName}, ${data.mobileNumber}, ${data.address}, ${data.shopName}, ${data.balance}, 'active', ${now}, ${now})
    `;
    const rows = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
    return this.getSupplierById(resolvedTenantId, Number(rows[0].id));
  },

  async updateSupplier(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    await this.getSupplierById(resolvedTenantId, supplierId);
    const data = validateSupplierPayload(payload);
    await ensureUniqueSupplierName(resolvedTenantId, data.supplierName, supplierId);

    await prisma.$executeRaw`
      UPDATE store_suppliers
      SET supplierName = ${data.supplierName},
          mobileNumber = ${data.mobileNumber},
          address = ${data.address},
          shopName = ${data.shopName},
          balance = ${data.balance},
          updatedAt = ${new Date()}
      WHERE id = ${supplierId} AND tenant_id = ${resolvedTenantId}
    `;

    return this.getSupplierById(resolvedTenantId, supplierId);
  },

  async deleteSupplier(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    await this.getSupplierById(resolvedTenantId, supplierId);
    await prisma.$executeRaw`UPDATE store_suppliers SET status = 'inactive', updatedAt = ${new Date()} WHERE id = ${supplierId} AND tenant_id = ${resolvedTenantId}`;
    return { id: supplierId };
  },

  async getSupplierPurchases(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    await this.getSupplierById(resolvedTenantId, supplierId);
    const rows = await prisma.$queryRaw`
      SELECT p.*, s.supplierName, s.balance AS supplierBalance
      FROM store_purchases p
      JOIN store_suppliers s ON s.id = p.supplierId
      WHERE p.supplierId = ${supplierId}
        AND p.tenant_id = ${resolvedTenantId}
        AND s.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR p.branch_id = ${branchId})
        AND p.status = 'active'
      ORDER BY p.purchaseDate DESC, p.id DESC
    `;

    const purchases = [];
    for (const row of rows) {
      const itemRows = await prisma.$queryRaw`
        SELECT pi.*, i.itemName, i.unit, i.itemCode, u.name AS unitName, u.shortName AS unitShortName
        FROM store_purchase_items pi
        JOIN store_items i ON i.id = pi.itemId
        LEFT JOIN store_units u ON u.id = pi.unitId AND u.tenant_id = ${resolvedTenantId}
        WHERE pi.purchaseId = ${Number(row.id)}
          AND pi.tenant_id = ${resolvedTenantId}
          AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
          AND i.tenant_id = ${resolvedTenantId}
        ORDER BY pi.id ASC
      `;
      purchases.push(mapPurchase(row, itemRows));
    }

    return { items: purchases, meta: null };
  },

  async getSupplierPayments(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    await this.getSupplierById(resolvedTenantId, supplierId);
    const rows = await prisma.$queryRaw`
      SELECT id, supplierId, amount, paymentDate, paymentMethod, note, status, createdAt, updatedAt
      FROM store_supplier_payments
      WHERE supplierId = ${supplierId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active'
      ORDER BY paymentDate DESC, id DESC
    `;
    return { items: rows.map(mapSupplierPayment), meta: null };
  },

  async createSupplierPayment(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    await ensureStorePurchaseTables();
    const supplierId = normalizeId(id);
    await this.getSupplierById(resolvedTenantId, supplierId);
    const data = validatePaymentPayload(payload);
    const now = new Date();

    const paymentId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO store_supplier_payments (tenant_id, branch_id, supplierId, amount, paymentDate, paymentMethod, note, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${branchId}, ${supplierId}, ${data.amount}, ${data.paymentDate}, ${data.paymentMethod}, ${data.note}, 'active', ${now}, ${now})
      `;
      const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      const nextPaymentId = Number(rows[0].id);
      await tx.$executeRaw`UPDATE store_suppliers SET balance = balance - ${data.amount}, updatedAt = ${now} WHERE id = ${supplierId} AND tenant_id = ${resolvedTenantId}`;
      await createSupplierPaymentFinanceTransaction(tx, resolvedTenantId, supplierId, nextPaymentId, data, branchId);
      return nextPaymentId;
    });

    const paymentRows = await prisma.$queryRaw`
      SELECT id, supplierId, amount, paymentDate, paymentMethod, note, status, createdAt, updatedAt
      FROM store_supplier_payments
      WHERE id = ${paymentId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId})
      LIMIT 1
    `;

    return paymentRows.length ? mapSupplierPayment(paymentRows[0]) : this.getSupplierPayments(resolvedTenantId, supplierId, branchScope);
  },

  async getPurchases(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    await ensureStorePurchaseTables();
    const search = normalizeText(query.search);
    const supplierId = query.supplierId ? normalizeId(query.supplierId) : null;
    const { fromDate, toDate } = getReportDateRange(query);
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT p.*, s.supplierName, s.balance AS supplierBalance
      FROM store_purchases p
      JOIN store_suppliers s ON s.id = p.supplierId
      WHERE p.tenant_id = ${resolvedTenantId}
        AND s.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR p.branch_id = ${branchId})
        AND p.status = 'active'
        AND (${search} = '' OR s.supplierName LIKE ${searchTerm} OR p.invoiceNumber LIKE ${searchTerm})
        AND (${supplierId} IS NULL OR p.supplierId = ${supplierId})
        AND (${fromDate} IS NULL OR p.purchaseDate >= ${fromDate})
        AND (${toDate} IS NULL OR p.purchaseDate <= ${toDate})
      ORDER BY p.purchaseDate DESC, p.id DESC
    `;

    const purchases = [];
    for (const row of rows) {
      const itemRows = await prisma.$queryRaw`
        SELECT pi.*, i.itemName, i.unit, i.itemCode, u.name AS unitName, u.shortName AS unitShortName
        FROM store_purchase_items pi
        JOIN store_items i ON i.id = pi.itemId
        LEFT JOIN store_units u ON u.id = pi.unitId AND u.tenant_id = ${resolvedTenantId}
        WHERE pi.purchaseId = ${Number(row.id)}
          AND pi.tenant_id = ${resolvedTenantId}
          AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
          AND i.tenant_id = ${resolvedTenantId}
        ORDER BY pi.id ASC
      `;
      purchases.push(mapPurchase(row, itemRows));
    }

    return { items: purchases, meta: null };
  },

  async getPurchaseById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    return getPurchaseRows(resolvedTenantId, id, getScopedBranchId(branchScope));
  },

  async createPurchase(tenantId, { body, file }, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, body, branchScope);
    await ensureStorePurchaseTables();
    const data = await validatePurchasePayload(resolvedTenantId, body);
    const invoiceImage = buildInvoiceImagePath(file);

    return prisma.$transaction(async (tx) => {
      const supplier = await getOrCreateSupplier(tx, resolvedTenantId, body);
      const now = new Date();

      await tx.$executeRaw`
        INSERT INTO store_purchases (tenant_id, branch_id, purchaseDate, supplierId, invoiceNumber, totalAmount, paidAmount, remainingAmount, paymentMethod, invoiceImage, approvalStatus, financeTransactionId, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${branchId}, ${data.purchaseDate}, ${supplier.id}, ${data.invoiceNumber}, ${data.totalAmount}, ${data.paidAmount}, ${data.remainingAmount}, ${data.paymentMethod}, ${invoiceImage}, ${data.approvalStatus}, NULL, 'active', ${now}, ${now})
      `;
      const purchaseRows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      const purchaseId = Number(purchaseRows[0].id);

      for (const item of data.items) {
        await tx.$executeRaw`
          INSERT INTO store_purchase_items (tenant_id, branch_id, purchaseId, itemId, unitId, quantity, rate, total, createdAt, updatedAt)
          VALUES (${resolvedTenantId}, ${branchId}, ${purchaseId}, ${item.itemId}, ${item.unitId}, ${item.quantity}, ${item.rate}, ${item.total}, ${now}, ${now})
        `;
      }

      if (data.approvalStatus === 'approved') {
        const financeTransactionId = await createPurchaseFinanceTransaction(tx, resolvedTenantId, purchaseId, data, branchId);
        await tx.$executeRaw`UPDATE store_purchases SET financeTransactionId = ${financeTransactionId}, updatedAt = ${now} WHERE id = ${purchaseId} AND tenant_id = ${resolvedTenantId}`;
        await applyStockChange(tx, resolvedTenantId, data.items, 1);
        await tx.$executeRaw`UPDATE store_suppliers SET balance = balance + ${data.remainingAmount}, updatedAt = ${now} WHERE id = ${supplier.id} AND tenant_id = ${resolvedTenantId}`;
      }

      return purchaseId;
    }).then((purchaseId) => getPurchaseRows(resolvedTenantId, purchaseId, branchId));
  },

  async updatePurchase(tenantId, id, { body, file }, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, body, branchScope);
    await ensureStorePurchaseTables();
    const purchaseId = normalizeId(id);
    const existing = await getPurchaseRows(resolvedTenantId, purchaseId, branchId);
    const data = await validatePurchasePayload(resolvedTenantId, body);
    const invoiceImage = buildInvoiceImagePath(file) || existing.invoiceImage || null;

    return prisma.$transaction(async (tx) => {
      const supplier = await getOrCreateSupplier(tx, resolvedTenantId, body);
      const now = new Date();

      if (existing.approvalStatus === 'approved') {
        await applyStockChange(tx, resolvedTenantId, existing.items, -1);
        await tx.$executeRaw`UPDATE store_suppliers SET balance = balance - ${existing.remainingAmount}, updatedAt = ${now} WHERE id = ${existing.supplierId} AND tenant_id = ${resolvedTenantId}`;
      }

      await tx.$executeRaw`DELETE FROM store_purchase_items WHERE purchaseId = ${purchaseId} AND tenant_id = ${resolvedTenantId}`;
      for (const item of data.items) {
        await tx.$executeRaw`
          INSERT INTO store_purchase_items (tenant_id, branch_id, purchaseId, itemId, unitId, quantity, rate, total, createdAt, updatedAt)
          VALUES (${resolvedTenantId}, ${branchId}, ${purchaseId}, ${item.itemId}, ${item.unitId}, ${item.quantity}, ${item.rate}, ${item.total}, ${now}, ${now})
        `;
      }

      await tx.$executeRaw`
        UPDATE store_purchases
        SET purchaseDate = ${data.purchaseDate},
            branch_id = ${branchId},
            supplierId = ${supplier.id},
            invoiceNumber = ${data.invoiceNumber},
            totalAmount = ${data.totalAmount},
            paidAmount = ${data.paidAmount},
            remainingAmount = ${data.remainingAmount},
            paymentMethod = ${data.paymentMethod},
            invoiceImage = ${invoiceImage},
            approvalStatus = ${data.approvalStatus},
            updatedAt = ${now}
        WHERE id = ${purchaseId} AND tenant_id = ${resolvedTenantId}
      `;

      if (data.approvalStatus === 'approved') {
        await applyStockChange(tx, resolvedTenantId, data.items, 1);
        await tx.$executeRaw`UPDATE store_suppliers SET balance = balance + ${data.remainingAmount}, updatedAt = ${now} WHERE id = ${supplier.id} AND tenant_id = ${resolvedTenantId}`;
      }

      if (existing.financeTransactionId && data.approvalStatus === 'approved') {
        await tx.$executeRaw`
          UPDATE finance_transactions
          SET amount = ${data.totalAmount},
              transactionDate = ${data.purchaseDate},
              paymentMode = ${data.paymentMethod},
              paymentStatus = ${data.remainingAmount > 0 ? 'جزوی' : 'مکمل'},
              details = ${data.invoiceNumber},
              referenceType = 'store_purchase',
              referenceId = ${purchaseId},
              updatedAt = ${now}
          WHERE id = ${Number(existing.financeTransactionId)} AND tenant_id = ${resolvedTenantId}
        `;
      } else if (!existing.financeTransactionId && data.approvalStatus === 'approved') {
        const financeTransactionId = await createPurchaseFinanceTransaction(tx, resolvedTenantId, purchaseId, data, branchId);
        await tx.$executeRaw`UPDATE store_purchases SET financeTransactionId = ${financeTransactionId}, updatedAt = ${now} WHERE id = ${purchaseId} AND tenant_id = ${resolvedTenantId}`;
      } else if (existing.financeTransactionId && data.approvalStatus !== 'approved') {
        await tx.$executeRaw`UPDATE finance_transactions SET status = 'inactive', updatedAt = ${now} WHERE id = ${Number(existing.financeTransactionId)} AND tenant_id = ${resolvedTenantId}`;
        await tx.$executeRaw`UPDATE store_purchases SET financeTransactionId = NULL, updatedAt = ${now} WHERE id = ${purchaseId} AND tenant_id = ${resolvedTenantId}`;
      }

      return purchaseId;
    }).then((updatedId) => getPurchaseRows(resolvedTenantId, updatedId, branchId));
  },

  async deletePurchase(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureStorePurchaseTables();
    const purchaseId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getPurchaseRows(resolvedTenantId, purchaseId, branchId);

    await prisma.$transaction(async (tx) => {
      const now = new Date();
      if (existing.approvalStatus === 'approved') {
        await applyStockChange(tx, resolvedTenantId, existing.items, -1);
        await tx.$executeRaw`UPDATE store_suppliers SET balance = balance - ${existing.remainingAmount}, updatedAt = ${now} WHERE id = ${existing.supplierId} AND tenant_id = ${resolvedTenantId}`;
      }
      await tx.$executeRaw`UPDATE store_purchases SET status = 'inactive', updatedAt = ${now} WHERE id = ${purchaseId} AND tenant_id = ${resolvedTenantId}`;
      if (existing.financeTransactionId) {
        await tx.$executeRaw`UPDATE finance_transactions SET status = 'inactive', updatedAt = ${now} WHERE id = ${Number(existing.financeTransactionId)} AND tenant_id = ${resolvedTenantId}`;
      }
    });

    return { id: purchaseId };
  },

  async getStockIssues(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const search = normalizeText(query.search);
    const department = normalizeText(query.department);
    const { fromDate, toDate } = getReportDateRange(query);
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT si.*, i.itemName, i.unit, i.currentStock
      FROM store_stock_issues si
      JOIN store_items i ON i.id = si.itemId
      WHERE si.tenant_id = ${resolvedTenantId}
        AND i.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR si.branch_id = ${branchId})
        AND si.status = 'active'
        AND (${search} = '' OR i.itemName LIKE ${searchTerm} OR si.department LIKE ${searchTerm} OR si.receiverName LIKE ${searchTerm})
        AND (${department} = '' OR si.department = ${department})
        AND (${fromDate} IS NULL OR si.issueDate >= ${fromDate})
        AND (${toDate} IS NULL OR si.issueDate <= ${toDate})
      ORDER BY si.issueDate DESC, si.id DESC
    `;
    return { items: rows.map(mapStockIssue), meta: null };
  },

  async getStockIssueById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getStockIssueRows(resolvedTenantId, id, getScopedBranchId(branchScope));
  },

  async createStockIssue(tenantId, { body, file }, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, body, branchScope);
    const data = validateStockIssuePayload(body);
    const receiverSignature = buildIssueSignaturePath(file);
    const now = new Date();

    const issueId = await prisma.$transaction(async (tx) => {
      if (data.approvalStatus === 'approved') {
        await applyIssueStockChange(tx, resolvedTenantId, data.itemId, data.quantity, -1);
      }

      await tx.$executeRaw`
        INSERT INTO store_stock_issues (tenant_id, branch_id, issueDate, itemId, quantity, returnedQuantity, department, receiverName, purpose, issuedBy, receiverSignature, approvalStatus, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${branchId}, ${data.issueDate}, ${data.itemId}, ${data.quantity}, 0, ${data.department}, ${data.receiverName}, ${data.purpose}, ${data.issuedBy}, ${receiverSignature}, ${data.approvalStatus}, 'active', ${now}, ${now})
      `;
      const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return Number(rows[0].id);
    });

    return getStockIssueRows(resolvedTenantId, issueId, branchId);
  },

  async updateStockIssue(tenantId, id, { body, file }, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, body, branchScope);
    const issueId = normalizeId(id);
    const existing = await getStockIssueRows(resolvedTenantId, issueId, branchId);
    const data = validateStockIssuePayload(body);
    const receiverSignature = buildIssueSignaturePath(file) || existing.receiverSignature || null;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      if (existing.approvalStatus === 'approved') {
        await applyIssueStockChange(tx, resolvedTenantId, existing.itemId, existing.quantity, 1);
      }
      if (data.approvalStatus === 'approved') {
        await applyIssueStockChange(tx, resolvedTenantId, data.itemId, data.quantity, -1);
      }

      await tx.$executeRaw`
        UPDATE store_stock_issues
        SET issueDate = ${data.issueDate},
            branch_id = ${branchId},
            itemId = ${data.itemId},
            quantity = ${data.quantity},
            department = ${data.department},
            receiverName = ${data.receiverName},
            purpose = ${data.purpose},
            issuedBy = ${data.issuedBy},
            receiverSignature = ${receiverSignature},
            approvalStatus = ${data.approvalStatus},
            updatedAt = ${now}
        WHERE id = ${issueId} AND tenant_id = ${resolvedTenantId}
      `;
    });

    return getStockIssueRows(resolvedTenantId, issueId, branchId);
  },

  async deleteStockIssue(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const issueId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getStockIssueRows(resolvedTenantId, issueId, branchId);
    await prisma.$transaction(async (tx) => {
      if (existing.approvalStatus === 'approved') {
        await applyIssueStockChange(tx, resolvedTenantId, existing.itemId, existing.quantity, 1);
      }
      await tx.$executeRaw`UPDATE store_stock_issues SET status = 'inactive', updatedAt = ${new Date()} WHERE id = ${issueId} AND tenant_id = ${resolvedTenantId}`;
    });
    return { id: issueId };
  },

  async approveStockIssue(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const issueId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getStockIssueRows(resolvedTenantId, issueId, branchId);
    if (existing.approvalStatus === 'approved') return existing;
    if (existing.approvalStatus === 'rejected') throw new AppError('رد شدہ ریکارڈ منظور نہیں کیا جا سکتا۔', 400);

    await prisma.$transaction(async (tx) => {
      await applyIssueStockChange(tx, resolvedTenantId, existing.itemId, existing.quantity, -1);
      await tx.$executeRaw`UPDATE store_stock_issues SET approvalStatus = 'approved', updatedAt = ${new Date()} WHERE id = ${issueId} AND tenant_id = ${resolvedTenantId}`;
    });
    return getStockIssueRows(resolvedTenantId, issueId, branchId);
  },

  async rejectStockIssue(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const issueId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getStockIssueRows(resolvedTenantId, issueId, branchId);

    await prisma.$transaction(async (tx) => {
      if (existing.approvalStatus === 'approved') {
        await applyIssueStockChange(tx, resolvedTenantId, existing.itemId, existing.quantity, 1);
      }
      await tx.$executeRaw`UPDATE store_stock_issues SET approvalStatus = 'rejected', updatedAt = ${new Date()} WHERE id = ${issueId} AND tenant_id = ${resolvedTenantId}`;
    });
    return getStockIssueRows(resolvedTenantId, issueId, branchId);
  },

  async getReturns(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const search = normalizeText(query.search);
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT r.*, si.quantity AS issuedQuantity, si.returnedQuantity, i.itemName, i.unit
      FROM store_returns r
      JOIN store_stock_issues si ON si.id = r.stockIssueId
      JOIN store_items i ON i.id = r.itemId
      WHERE r.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR r.branch_id = ${branchId})
        AND si.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR si.branch_id = ${branchId})
        AND i.tenant_id = ${resolvedTenantId}
        AND r.status = 'active'
        AND (${search} = '' OR i.itemName LIKE ${searchTerm} OR si.receiverName LIKE ${searchTerm} OR si.department LIKE ${searchTerm})
      ORDER BY r.createdAt DESC, r.id DESC
    `;
    return { items: rows.map(mapStoreReturn), meta: null };
  },

  async getReturnById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getReturnRows(resolvedTenantId, id, getScopedBranchId(branchScope));
  },

  async createReturn(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const data = validateReturnPayload(payload);
    const now = new Date();

    const returnId = await prisma.$transaction(async (tx) => {
      const issueRows = await tx.$queryRaw`
        SELECT id, itemId, quantity, returnedQuantity, approvalStatus, status
        FROM store_stock_issues
        WHERE id = ${data.stockIssueId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active'
        LIMIT 1
      `;
      if (!issueRows.length) throw new AppError('اسٹاک اجراء ریکارڈ نہیں ملا۔', 404);
      const issue = issueRows[0];
      if (issue.approvalStatus !== 'approved') throw new AppError('صرف منظور شدہ اجراء کے خلاف واپسی ہو سکتی ہے۔', 400);
      const availableReturn = toAmount(issue.quantity) - toAmount(issue.returnedQuantity);
      if (data.returnQuantity > availableReturn) throw new AppError('واپسی مقدار جاری شدہ باقی مقدار سے زیادہ نہیں ہو سکتی۔', 400);

      await tx.$executeRaw`
        INSERT INTO store_returns (tenant_id, branch_id, stockIssueId, itemId, returnQuantity, \`condition\`, addToStock, note, status, createdAt, updatedAt)
        VALUES (${resolvedTenantId}, ${branchId}, ${data.stockIssueId}, ${Number(issue.itemId)}, ${data.returnQuantity}, ${data.condition}, ${data.addToStock}, ${data.note}, 'active', ${now}, ${now})
      `;
      const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      const nextReturnId = Number(rows[0].id);

      await tx.$executeRaw`UPDATE store_stock_issues SET returnedQuantity = returnedQuantity + ${data.returnQuantity}, updatedAt = ${now} WHERE id = ${data.stockIssueId} AND tenant_id = ${resolvedTenantId}`;

      if (data.condition === 'good' && data.addToStock) {
        await tx.$executeRaw`UPDATE store_items SET currentStock = currentStock + ${data.returnQuantity}, updatedAt = ${now} WHERE id = ${Number(issue.itemId)} AND tenant_id = ${resolvedTenantId}`;
      } else {
        await tx.$executeRaw`
          INSERT INTO store_damaged_stock (tenant_id, branch_id, returnId, itemId, quantity, note, status, createdAt, updatedAt)
          VALUES (${resolvedTenantId}, ${branchId}, ${nextReturnId}, ${Number(issue.itemId)}, ${data.returnQuantity}, ${data.note}, 'active', ${now}, ${now})
        `;
      }

      return nextReturnId;
    });

    return getReturnRows(resolvedTenantId, returnId, branchId);
  },

  async deleteReturn(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const returnId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getReturnRows(resolvedTenantId, returnId, branchId);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE store_returns SET status = 'inactive', updatedAt = ${now} WHERE id = ${returnId} AND tenant_id = ${resolvedTenantId}`;
      await tx.$executeRaw`UPDATE store_stock_issues SET returnedQuantity = returnedQuantity - ${existing.returnQuantity}, updatedAt = ${now} WHERE id = ${existing.stockIssueId} AND tenant_id = ${resolvedTenantId}`;

      if (existing.condition === 'good' && existing.addToStock) {
        await tx.$executeRaw`UPDATE store_items SET currentStock = currentStock - ${existing.returnQuantity}, updatedAt = ${now} WHERE id = ${existing.itemId} AND tenant_id = ${resolvedTenantId}`;
      } else {
        await tx.$executeRaw`UPDATE store_damaged_stock SET status = 'inactive', updatedAt = ${now} WHERE returnId = ${returnId} AND tenant_id = ${resolvedTenantId}`;
      }
    });

    return { id: returnId };
  },

  async getDamagedStock(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const search = normalizeText(query.search);
    const searchTerm = `%${search}%`;
    const rows = await prisma.$queryRaw`
      SELECT ds.*, i.itemName, i.unit, i.currentStock, i.purchasePrice
      FROM store_damaged_stock ds
      JOIN store_items i ON i.id = ds.itemId
      WHERE ds.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ds.branch_id = ${branchId})
        AND i.tenant_id = ${resolvedTenantId}
        AND ds.status = 'active'
        AND (${search} = '' OR i.itemName LIKE ${searchTerm} OR ds.reason LIKE ${searchTerm} OR ds.responsiblePerson LIKE ${searchTerm})
      ORDER BY ds.date DESC, ds.id DESC
    `;
    return { items: rows.map(mapDamagedStock), meta: null };
  },

  async getDamagedStockById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getDamagedStockRows(resolvedTenantId, id, getScopedBranchId(branchScope));
  },

  async createDamagedStock(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const data = validateDamagedStockPayload(payload);
    const itemRows = await prisma.$queryRaw`SELECT id, purchasePrice FROM store_items WHERE id = ${data.itemId} AND tenant_id = ${resolvedTenantId} AND status = 'active' LIMIT 1`;
    if (!itemRows.length) throw new AppError('منتخب شے نہیں ملی۔', 404);
    const amountLoss = toAmount(itemRows[0].purchasePrice) * data.quantity;
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO store_damaged_stock (tenant_id, branch_id, returnId, itemId, quantity, reason, date, responsiblePerson, amountLoss, approvalStatus, note, status, createdAt, updatedAt)
      VALUES (${resolvedTenantId}, ${branchId}, NULL, ${data.itemId}, ${data.quantity}, ${data.reason}, ${data.date}, ${data.responsiblePerson}, ${amountLoss}, 'pending', ${data.note}, 'active', ${now}, ${now})
    `;
    const rows = await prisma.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
    return getDamagedStockRows(resolvedTenantId, Number(rows[0].id));
  },

  async approveDamagedStock(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const damagedId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getDamagedStockRows(resolvedTenantId, damagedId, branchId);
    if (existing.approvalStatus === 'approved') return existing;
    if (existing.approvalStatus === 'rejected') throw new AppError('رد شدہ ریکارڈ منظور نہیں کیا جا سکتا۔', 400);

    await prisma.$transaction(async (tx) => {
      await ensureIssueStock(tx, resolvedTenantId, existing.itemId, existing.quantity);
      await tx.$executeRaw`UPDATE store_items SET currentStock = currentStock - ${existing.quantity}, updatedAt = ${new Date()} WHERE id = ${existing.itemId} AND tenant_id = ${resolvedTenantId}`;
      await tx.$executeRaw`UPDATE store_damaged_stock SET approvalStatus = 'approved', updatedAt = ${new Date()} WHERE id = ${damagedId} AND tenant_id = ${resolvedTenantId}`;
    });
    return getDamagedStockRows(resolvedTenantId, damagedId, branchId);
  },

  async rejectDamagedStock(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const damagedId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getDamagedStockRows(resolvedTenantId, damagedId, branchId);
    if (existing.approvalStatus === 'approved') throw new AppError('منظور شدہ ریکارڈ رد نہیں کیا جا سکتا۔', 400);
    await prisma.$executeRaw`UPDATE store_damaged_stock SET approvalStatus = 'rejected', updatedAt = ${new Date()} WHERE id = ${damagedId} AND tenant_id = ${resolvedTenantId}`;
    return getDamagedStockRows(resolvedTenantId, damagedId, branchId);
  },

  async deleteDamagedStock(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const damagedId = normalizeId(id);
    const branchId = getScopedBranchId(branchScope);
    const existing = await getDamagedStockRows(resolvedTenantId, damagedId, branchId);

    await prisma.$transaction(async (tx) => {
      if (existing.approvalStatus === 'approved' && !existing.returnId) {
        await tx.$executeRaw`UPDATE store_items SET currentStock = currentStock + ${existing.quantity}, updatedAt = ${new Date()} WHERE id = ${existing.itemId} AND tenant_id = ${resolvedTenantId}`;
      }
      await tx.$executeRaw`UPDATE store_damaged_stock SET status = 'inactive', updatedAt = ${new Date()} WHERE id = ${damagedId} AND tenant_id = ${resolvedTenantId}`;
    });

    return { id: damagedId };
  },

  async getApprovals(tenantId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const purchaseRows = await prisma.$queryRaw`
      SELECT p.id, p.purchaseDate, p.invoiceNumber, p.totalAmount, p.paidAmount, p.remainingAmount, p.paymentMethod, p.approvalStatus, p.createdAt,
             s.supplierName
      FROM store_purchases p
      JOIN store_suppliers s ON s.id = p.supplierId
      WHERE p.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR p.branch_id = ${branchId})
        AND s.tenant_id = ${resolvedTenantId}
        AND p.status = 'active' AND p.approvalStatus = 'pending'
      ORDER BY p.createdAt DESC, p.id DESC
    `;

    const stockOutRows = await prisma.$queryRaw`
      SELECT si.id, si.issueDate, si.quantity, si.department, si.receiverName, si.purpose, si.issuedBy, si.approvalStatus, si.createdAt,
             i.itemName, i.unit, i.currentStock
      FROM store_stock_issues si
      JOIN store_items i ON i.id = si.itemId
      WHERE si.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR si.branch_id = ${branchId})
        AND i.tenant_id = ${resolvedTenantId}
        AND si.status = 'active' AND si.approvalStatus = 'pending'
      ORDER BY si.createdAt DESC, si.id DESC
    `;

    const damageRows = await prisma.$queryRaw`
      SELECT ds.id, ds.date, ds.quantity, ds.reason, ds.responsiblePerson, ds.amountLoss, ds.approvalStatus, ds.createdAt,
             i.itemName, i.unit, i.currentStock
      FROM store_damaged_stock ds
      JOIN store_items i ON i.id = ds.itemId
      WHERE ds.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ds.branch_id = ${branchId})
        AND i.tenant_id = ${resolvedTenantId}
        AND ds.status = 'active' AND ds.approvalStatus = 'pending'
      ORDER BY ds.createdAt DESC, ds.id DESC
    `;

    const adjustmentRows = await prisma.$queryRaw`
      SELECT sa.id, sa.adjustmentType, sa.quantity, sa.previousStock, sa.adjustedStock, sa.reason, sa.approvalStatus, sa.createdAt,
             i.itemName, i.unit, i.currentStock
      FROM store_stock_adjustments sa
      JOIN store_items i ON i.id = sa.itemId
      WHERE sa.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR sa.branch_id = ${branchId})
        AND i.tenant_id = ${resolvedTenantId}
        AND sa.status = 'active' AND sa.approvalStatus = 'pending'
      ORDER BY sa.createdAt DESC, sa.id DESC
    `;

    return {
      purchases: mapReportRows(purchaseRows),
      stockOut: mapReportRows(stockOutRows),
      damages: mapReportRows(damageRows),
      adjustments: mapReportRows(adjustmentRows),
      summary: {
        purchases: purchaseRows.length,
        stockOut: stockOutRows.length,
        damages: damageRows.length,
        adjustments: adjustmentRows.length,
      },
    };
  },

  async approveApproval({ tenantId, moduleType, id, remarks, admin, branchScope = null, auditContext = {} }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const normalizedModule = normalizeApprovalModule(moduleType);
    const recordId = normalizeId(id);
    const approvedBy = getApproverName(admin);
    const cleanRemarks = normalizeText(remarks) || null;
    const branchId = getScopedBranchId(branchScope);

    if (normalizedModule === 'purchase') {
      const existing = await getPurchaseRows(resolvedTenantId, recordId, branchId);
      if (existing.approvalStatus === 'approved') return existing;
      if (existing.approvalStatus === 'rejected') throw new AppError('رد شدہ ریکارڈ منظور نہیں کیا جا سکتا۔', 400);

      await prisma.$transaction(async (tx) => {
        const now = new Date();
        const financeTransactionId = existing.financeTransactionId ? Number(existing.financeTransactionId) : await createPurchaseFinanceTransaction(tx, resolvedTenantId, recordId, existing, existing.branchId || null);
        await applyStockChange(tx, resolvedTenantId, existing.items, 1);
        await tx.$executeRaw`UPDATE store_suppliers SET balance = balance + ${existing.remainingAmount}, updatedAt = ${now} WHERE id = ${existing.supplierId} AND tenant_id = ${resolvedTenantId}`;
        await tx.$executeRaw`UPDATE store_purchases SET approvalStatus = 'approved', financeTransactionId = ${financeTransactionId}, updatedAt = ${now} WHERE id = ${recordId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId})`;
        await createApprovalLog(tx, { tenantId: resolvedTenantId, moduleType: normalizedModule, recordId, status: 'approved', approvedBy, remarks: cleanRemarks });
      });

      const result = await getPurchaseRows(resolvedTenantId, recordId, branchId);
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: result.branchId || existing.branchId || branchId,
        action: 'store.approval.approved',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: result,
      }, auditContext);
      return result;
    }

    if (normalizedModule === 'stock-out') {
      const existing = await getStockIssueRows(resolvedTenantId, recordId, branchId);
      const result = await this.approveStockIssue(resolvedTenantId, recordId, branchScope);
      await prisma.$executeRaw`
        INSERT INTO store_approval_logs (tenant_id, moduleType, recordId, status, approvedBy, remarks, createdAt)
        VALUES (${resolvedTenantId}, ${normalizedModule}, ${recordId}, 'approved', ${approvedBy}, ${cleanRemarks}, ${new Date()})
      `;
      const finalResult = existing.approvalStatus === 'approved' ? existing : result;
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: finalResult.branchId || existing.branchId || branchId,
        action: 'store.approval.approved',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: finalResult,
      }, auditContext);
      return finalResult;
    }

    if (normalizedModule === 'damage') {
      const existing = await getDamagedStockRows(resolvedTenantId, recordId, branchId);
      const result = await this.approveDamagedStock(resolvedTenantId, recordId, branchScope);
      await prisma.$executeRaw`
        INSERT INTO store_approval_logs (tenant_id, moduleType, recordId, status, approvedBy, remarks, createdAt)
        VALUES (${resolvedTenantId}, ${normalizedModule}, ${recordId}, 'approved', ${approvedBy}, ${cleanRemarks}, ${new Date()})
      `;
      const finalResult = existing.approvalStatus === 'approved' ? existing : result;
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: finalResult.branchId || existing.branchId || branchId,
        action: 'store.approval.approved',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: finalResult,
      }, auditContext);
      return finalResult;
    }

    const adjustment = await getStockAdjustmentRows(resolvedTenantId, recordId, branchId);
    if (adjustment.approvalStatus === 'approved') return adjustment;
    if (adjustment.approvalStatus === 'rejected') throw new AppError('رد شدہ ریکارڈ منظور نہیں کیا جا سکتا۔', 400);

    await prisma.$transaction(async (tx) => {
      const itemRows = await tx.$queryRaw`SELECT currentStock FROM store_items WHERE id = ${adjustment.itemId} AND tenant_id = ${resolvedTenantId} AND status = 'active' LIMIT 1`;
      if (!itemRows.length) throw new AppError('منتخب شے نہیں ملی۔', 404);

      const previousStock = toAmount(itemRows[0].currentStock);
      let adjustedStock = previousStock;

      if (adjustment.adjustmentType === 'increase') adjustedStock = previousStock + adjustment.quantity;
      if (adjustment.adjustmentType === 'decrease') {
        if (previousStock < adjustment.quantity) throw new AppError('موجودہ اسٹاک مطلوبہ مقدار سے کم ہے۔', 400);
        adjustedStock = previousStock - adjustment.quantity;
      }
      if (adjustment.adjustmentType === 'set') adjustedStock = adjustment.quantity;

      await tx.$executeRaw`UPDATE store_items SET currentStock = ${adjustedStock}, updatedAt = ${new Date()} WHERE id = ${adjustment.itemId} AND tenant_id = ${resolvedTenantId}`;
      await tx.$executeRaw`
        UPDATE store_stock_adjustments
        SET previousStock = ${previousStock}, adjustedStock = ${adjustedStock}, approvalStatus = 'approved', updatedAt = ${new Date()}
        WHERE id = ${recordId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId})
      `;
      await createApprovalLog(tx, { tenantId: resolvedTenantId, moduleType: normalizedModule, recordId, status: 'approved', approvedBy, remarks: cleanRemarks });
    });

    const result = await getStockAdjustmentRows(resolvedTenantId, recordId, branchId);
    await recordStoreAudit({
      tenantId: resolvedTenantId,
      branchId: result.branchId || adjustment.branchId || branchId,
      action: 'store.approval.approved',
      targetType: `store_${normalizedModule}`,
      targetId: recordId,
      oldValue: adjustment,
      newValue: result,
    }, auditContext);
    return result;
  },

  async rejectApproval({ tenantId, moduleType, id, remarks, admin, branchScope = null, auditContext = {} }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const normalizedModule = normalizeApprovalModule(moduleType);
    const recordId = normalizeId(id);
    const approvedBy = getApproverName(admin);
    const cleanRemarks = normalizeText(remarks) || null;
    const branchId = getScopedBranchId(branchScope);

    if (normalizedModule === 'purchase') {
      const existing = await getPurchaseRows(resolvedTenantId, recordId, branchId);
      if (existing.approvalStatus === 'approved') throw new AppError('منظور شدہ ریکارڈ رد نہیں کیا جا سکتا۔', 400);

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`UPDATE store_purchases SET approvalStatus = 'rejected', updatedAt = ${new Date()} WHERE id = ${recordId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId})`;
        await createApprovalLog(tx, { tenantId: resolvedTenantId, moduleType: normalizedModule, recordId, status: 'rejected', approvedBy, remarks: cleanRemarks });
      });

      const result = await getPurchaseRows(resolvedTenantId, recordId, branchId);
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: result.branchId || existing.branchId || branchId,
        action: 'store.approval.rejected',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: result,
      }, auditContext);
      return result;
    }

    if (normalizedModule === 'stock-out') {
      const existing = await getStockIssueRows(resolvedTenantId, recordId, branchId);
      if (existing.approvalStatus === 'approved') throw new AppError('منظور شدہ ریکارڈ رد نہیں کیا جا سکتا۔', 400);
      const result = await this.rejectStockIssue(resolvedTenantId, recordId, branchScope);
      await prisma.$executeRaw`
        INSERT INTO store_approval_logs (tenant_id, moduleType, recordId, status, approvedBy, remarks, createdAt)
        VALUES (${resolvedTenantId}, ${normalizedModule}, ${recordId}, 'rejected', ${approvedBy}, ${cleanRemarks}, ${new Date()})
      `;
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: result.branchId || existing.branchId || branchId,
        action: 'store.approval.rejected',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: result,
      }, auditContext);
      return result;
    }

    if (normalizedModule === 'damage') {
      const existing = await getDamagedStockRows(resolvedTenantId, recordId, branchId);
      if (existing.approvalStatus === 'approved') throw new AppError('منظور شدہ ریکارڈ رد نہیں کیا جا سکتا۔', 400);
      const result = await this.rejectDamagedStock(resolvedTenantId, recordId, branchScope);
      await prisma.$executeRaw`
        INSERT INTO store_approval_logs (tenant_id, moduleType, recordId, status, approvedBy, remarks, createdAt)
        VALUES (${resolvedTenantId}, ${normalizedModule}, ${recordId}, 'rejected', ${approvedBy}, ${cleanRemarks}, ${new Date()})
      `;
      await recordStoreAudit({
        tenantId: resolvedTenantId,
        branchId: result.branchId || existing.branchId || branchId,
        action: 'store.approval.rejected',
        targetType: `store_${normalizedModule}`,
        targetId: recordId,
        oldValue: existing,
        newValue: result,
      }, auditContext);
      return result;
    }

    const adjustment = await getStockAdjustmentRows(resolvedTenantId, recordId, branchId);
    if (adjustment.approvalStatus === 'approved') throw new AppError('منظور شدہ ریکارڈ رد نہیں کیا جا سکتا۔', 400);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE store_stock_adjustments SET approvalStatus = 'rejected', updatedAt = ${new Date()} WHERE id = ${recordId} AND tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId})`;
      await createApprovalLog(tx, { tenantId: resolvedTenantId, moduleType: normalizedModule, recordId, status: 'rejected', approvedBy, remarks: cleanRemarks });
    });

    const result = await getStockAdjustmentRows(resolvedTenantId, recordId, branchId);
    await recordStoreAudit({
      tenantId: resolvedTenantId,
      branchId: result.branchId || adjustment.branchId || branchId,
      action: 'store.approval.rejected',
      targetType: `store_${normalizedModule}`,
      targetId: recordId,
      oldValue: adjustment,
      newValue: result,
    }, auditContext);
    return result;
  },

  async exportPurchases({ tenantId, query = {}, format = 'html', admin = null, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const profile = await getMadrassaPrintProfile(resolvedTenantId, admin);
    const result = await this.getPurchases(resolvedTenantId, query, branchScope);
    const rows = result.items || [];

    if (format === 'csv') {
      return buildCsv(purchaseExportColumns, rows);
    }

    return buildPrintHtml({
      profile,
      title: 'خریداری رپورٹ',
      subtitle: 'فلٹرز کے مطابق خریداری ریکارڈ',
      columns: purchaseExportColumns,
      rows,
      summary: `کل ریکارڈ: ${formatAmount(rows.length)} | کل رقم: ${formatAmount(rows.reduce((sum, row) => sum + toAmount(row.totalAmount), 0))}`,
      footerNote: 'خریداری رپورٹ',
    });
  },

  async exportStockReport({ tenantId, query = {}, format = 'html', admin = null, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const profile = await getMadrassaPrintProfile(resolvedTenantId, admin);
    const result = await this.getDailyStockReport(resolvedTenantId, query, branchScope);
    const rows = result.items || [];

    if (format === 'csv') {
      return buildCsv(stockExportColumns, rows);
    }

    return buildPrintHtml({
      profile,
      title: 'اسٹاک رپورٹ',
      subtitle: 'موجودہ اسٹاک اور مالیت',
      columns: stockExportColumns,
      rows,
      summary: `کل اشیاء: ${formatAmount(rows.length)} | کل مالیت: ${formatAmount(rows.reduce((sum, row) => sum + toAmount(row.stockValue || row.currentStock * row.purchasePrice), 0))}`,
      footerNote: 'اسٹاک رپورٹ',
    });
  },

  async getPurchaseInvoiceHtml(tenantId, id, admin = null, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const profile = await getMadrassaPrintProfile(resolvedTenantId, admin);
    const purchase = await getPurchaseRows(resolvedTenantId, id, getScopedBranchId(branchScope));
    const columns = [
      { label: 'شے', value: (row) => row.itemName || '-' },
      { label: 'کوڈ', value: (row) => row.itemCode || '-' },
      { label: 'مقدار', value: (row) => formatAmount(row.quantity) },
      { label: 'ریٹ', value: (row) => formatAmount(row.rate) },
      { label: 'کل', value: (row) => formatAmount(row.total) },
    ];

    return buildPrintHtml({
      profile,
      title: 'خریداری انوائس',
      subtitle: `سپلائر: ${purchase.supplierName || '-'} | انوائس: ${purchase.invoiceNumber || '-'} | تاریخ: ${formatDate(purchase.purchaseDate)}`,
      columns,
      rows: purchase.items || [],
      summary: `کل رقم: ${formatAmount(purchase.totalAmount)} | ادا شدہ: ${formatAmount(purchase.paidAmount)} | باقی: ${formatAmount(purchase.remainingAmount)}`,
      footerNote: 'خریداری انوائس',
    });
  },

  async getIssueSlipHtml(tenantId, id, admin = null, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const profile = await getMadrassaPrintProfile(resolvedTenantId, admin);
    const issue = await getStockIssueRows(resolvedTenantId, id, getScopedBranchId(branchScope));
    const rows = [
      { label: 'تاریخ', value: formatDate(issue.issueDate) },
      { label: 'شے', value: issue.itemName || '-' },
      { label: 'مقدار', value: `${formatAmount(issue.quantity)} ${issue.unit || ''}` },
      { label: 'شعبہ', value: issue.department || '-' },
      { label: 'وصول کنندہ', value: issue.receiverName || '-' },
      { label: 'مقصد', value: issue.purpose || '-' },
      { label: 'اجراء کنندہ', value: issue.issuedBy || '-' },
      { label: 'حالت', value: issue.approvalStatus || '-' },
    ];
    const columns = [
      { label: 'عنوان', value: (row) => row.label },
      { label: 'تفصیل', value: (row) => row.value },
    ];

    return buildPrintHtml({
      profile,
      title: 'اسٹاک اجراء پرچی',
      subtitle: `حوالہ نمبر: ${issue.id}`,
      columns,
      rows,
      footerNote: 'اسٹاک اجراء پرچی',
    });
  },

  async getDailyStockReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const category = normalizeText(query.category);
    const stockQuantitySql = getBranchStockQuantitySql(resolvedTenantId, branchId);
    const rows = await prisma.$queryRaw`
      SELECT i.id, i.itemName, i.category, COALESCE(u.name, u.shortName, i.unit) AS unit, i.itemCode, ${stockQuantitySql} AS currentStock,
             COALESCE(latest_purchase.rate, i.purchasePrice) AS purchasePrice,
             (${stockQuantitySql} * COALESCE(latest_purchase.rate, i.purchasePrice)) AS stockValue
      FROM store_items i
      LEFT JOIN store_purchase_items latest_purchase ON latest_purchase.id = (
        SELECT pi.id
        FROM store_purchase_items pi
        JOIN store_purchases p ON p.id = pi.purchaseId
        WHERE pi.itemId = i.id
          AND pi.tenant_id = ${resolvedTenantId}
          AND p.tenant_id = ${resolvedTenantId}
          AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
          AND (${branchId} IS NULL OR p.branch_id = ${branchId})
          AND p.status = 'active'
          AND p.approvalStatus = 'approved'
        ORDER BY p.purchaseDate DESC, pi.id DESC
        LIMIT 1
      )
      LEFT JOIN store_units u ON u.id = latest_purchase.unitId AND u.tenant_id = ${resolvedTenantId}
      WHERE i.tenant_id = ${resolvedTenantId}
        AND i.status = 'active'
        AND (${category} = '' OR i.category = ${category})
      ORDER BY i.itemName ASC
    `;
    const items = mapReportRows(rows);
    return { items, summary: { totalItems: items.length, totalValue: items.reduce((sum, item) => sum + item.stockValue, 0) } };
  },

  async getMonthlyStockReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { fromDate, toDate } = getReportDateRange(query);
    const rows = await prisma.$queryRaw`
      SELECT monthLabel,
             SUM(purchaseQuantity) AS purchaseQuantity,
             SUM(issueQuantity) AS issueQuantity,
             SUM(returnQuantity) AS returnQuantity,
             SUM(damagedQuantity) AS damagedQuantity
      FROM (
        SELECT DATE_FORMAT(p.purchaseDate, '%Y-%m') AS monthLabel, SUM(pi.quantity) AS purchaseQuantity, 0 AS issueQuantity, 0 AS returnQuantity, 0 AS damagedQuantity
        FROM store_purchases p
        JOIN store_purchase_items pi ON pi.purchaseId = p.id
        WHERE p.tenant_id = ${resolvedTenantId} AND pi.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR p.branch_id = ${branchId}) AND (${branchId} IS NULL OR pi.branch_id = ${branchId}) AND p.status = 'active' AND (${fromDate} IS NULL OR p.purchaseDate >= ${fromDate}) AND (${toDate} IS NULL OR p.purchaseDate <= ${toDate})
        GROUP BY DATE_FORMAT(p.purchaseDate, '%Y-%m')
        UNION ALL
        SELECT DATE_FORMAT(issueDate, '%Y-%m') AS monthLabel, 0, SUM(quantity), 0, 0
        FROM store_stock_issues
        WHERE tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active' AND approvalStatus = 'approved' AND (${fromDate} IS NULL OR issueDate >= ${fromDate}) AND (${toDate} IS NULL OR issueDate <= ${toDate})
        GROUP BY DATE_FORMAT(issueDate, '%Y-%m')
        UNION ALL
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS monthLabel, 0, 0, SUM(returnQuantity), 0
        FROM store_returns
        WHERE tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active' AND (${fromDate} IS NULL OR createdAt >= ${fromDate}) AND (${toDate} IS NULL OR createdAt <= ${toDate})
        GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
        UNION ALL
        SELECT DATE_FORMAT(date, '%Y-%m') AS monthLabel, 0, 0, 0, SUM(quantity)
        FROM store_damaged_stock
        WHERE tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR branch_id = ${branchId}) AND status = 'active' AND approvalStatus = 'approved' AND (${fromDate} IS NULL OR date >= ${fromDate}) AND (${toDate} IS NULL OR date <= ${toDate})
        GROUP BY DATE_FORMAT(date, '%Y-%m')
      ) monthly
      GROUP BY monthLabel
      ORDER BY monthLabel DESC
    `;
    return { items: mapReportRows(rows), summary: null };
  },

  async getPurchaseReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { fromDate, toDate } = getReportDateRange(query);
    const supplierId = query.supplierId ? normalizeId(query.supplierId) : null;
    const rows = await prisma.$queryRaw`
      SELECT p.id, p.purchaseDate, p.invoiceNumber, s.supplierName, p.totalAmount, p.paidAmount, p.remainingAmount, p.paymentMethod, p.approvalStatus
      FROM store_purchases p
      JOIN store_suppliers s ON s.id = p.supplierId
      WHERE p.tenant_id = ${resolvedTenantId}
        AND s.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR p.branch_id = ${branchId})
        AND p.status = 'active'
        AND (${supplierId} IS NULL OR p.supplierId = ${supplierId})
        AND (${fromDate} IS NULL OR p.purchaseDate >= ${fromDate})
        AND (${toDate} IS NULL OR p.purchaseDate <= ${toDate})
      ORDER BY p.purchaseDate DESC, p.id DESC
    `;
    const items = mapReportRows(rows);
    return { items, summary: { totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0), paidAmount: items.reduce((sum, item) => sum + item.paidAmount, 0), remainingAmount: items.reduce((sum, item) => sum + item.remainingAmount, 0) } };
  },

  async getSupplierReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const rows = await prisma.$queryRaw`
      SELECT s.id, s.supplierName, s.mobileNumber, s.shopName,
             CASE
               WHEN ${branchId} IS NULL THEN s.balance
               ELSE COALESCE(SUM(p.remainingAmount), 0) - COALESCE((
                 SELECT SUM(sp.amount)
                 FROM store_supplier_payments sp
                 WHERE sp.supplierId = s.id
                   AND sp.tenant_id = ${resolvedTenantId}
                   AND sp.branch_id = ${branchId}
                   AND sp.status = 'active'
               ), 0)
             END AS balance,
             COALESCE(SUM(p.totalAmount), 0) AS totalPurchase,
             COALESCE(SUM(p.paidAmount), 0) AS totalPaid
      FROM store_suppliers s
      LEFT JOIN store_purchases p ON p.supplierId = s.id AND p.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR p.branch_id = ${branchId}) AND p.status = 'active'
      WHERE s.tenant_id = ${resolvedTenantId} AND s.status = 'active'
      GROUP BY s.id, s.supplierName, s.mobileNumber, s.shopName, s.balance
      ORDER BY s.supplierName ASC
    `;
    return { items: mapReportRows(rows), summary: null };
  },

  async getStockIssueReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { fromDate, toDate } = getReportDateRange(query);
    const department = normalizeText(query.department);
    const rows = await prisma.$queryRaw`
      SELECT si.id, si.issueDate, i.itemName, si.quantity, si.returnedQuantity, si.department, si.receiverName, si.issuedBy, si.approvalStatus
      FROM store_stock_issues si
      JOIN store_items i ON i.id = si.itemId
      WHERE si.tenant_id = ${resolvedTenantId}
        AND i.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR si.branch_id = ${branchId})
        AND si.status = 'active'
        AND (${department} = '' OR si.department = ${department})
        AND (${fromDate} IS NULL OR si.issueDate >= ${fromDate})
        AND (${toDate} IS NULL OR si.issueDate <= ${toDate})
      ORDER BY si.issueDate DESC, si.id DESC
    `;
    return { items: mapReportRows(rows), summary: null };
  },

  async getDepartmentWiseReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { fromDate, toDate } = getReportDateRange(query);
    const rows = await prisma.$queryRaw`
      SELECT department, COUNT(*) AS totalIssues, SUM(quantity) AS totalQuantity
      FROM store_stock_issues
      WHERE tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR branch_id = ${branchId})
        AND status = 'active'
        AND approvalStatus = 'approved'
        AND (${fromDate} IS NULL OR issueDate >= ${fromDate})
        AND (${toDate} IS NULL OR issueDate <= ${toDate})
      GROUP BY department
      ORDER BY department ASC
    `;
    return { items: mapReportRows(rows), summary: null };
  },

  async getLowStockReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const category = normalizeText(query.category);
    const limit = Number(query.limit || 10);
    const stockQuantitySql = getBranchStockQuantitySql(resolvedTenantId, branchId);
    const rows = await prisma.$queryRaw`
      SELECT i.id, i.itemName, i.category, COALESCE(u.name, u.shortName, i.unit) AS unit, i.itemCode, ${stockQuantitySql} AS currentStock,
             COALESCE(latest_purchase.rate, i.purchasePrice) AS purchasePrice,
             (${stockQuantitySql} * COALESCE(latest_purchase.rate, i.purchasePrice)) AS stockValue
      FROM store_items i
      LEFT JOIN store_purchase_items latest_purchase ON latest_purchase.id = (
        SELECT pi.id
        FROM store_purchase_items pi
        JOIN store_purchases p ON p.id = pi.purchaseId
        WHERE pi.itemId = i.id
          AND pi.tenant_id = ${resolvedTenantId}
          AND p.tenant_id = ${resolvedTenantId}
          AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
          AND (${branchId} IS NULL OR p.branch_id = ${branchId})
          AND p.status = 'active'
          AND p.approvalStatus = 'approved'
        ORDER BY p.purchaseDate DESC, pi.id DESC
        LIMIT 1
      )
      LEFT JOIN store_units u ON u.id = latest_purchase.unitId AND u.tenant_id = ${resolvedTenantId}
      WHERE i.tenant_id = ${resolvedTenantId}
        AND i.status = 'active'
        AND ${stockQuantitySql} <= ${Number.isFinite(limit) ? limit : 10}
        AND (${category} = '' OR i.category = ${category})
      ORDER BY currentStock ASC, i.itemName ASC
    `;
    const items = mapReportRows(rows);
    return { items, summary: { totalItems: items.length, totalValue: items.reduce((sum, item) => sum + item.stockValue, 0) } };
  },

  async getDamagedStockReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { fromDate, toDate } = getReportDateRange(query);
    const rows = await prisma.$queryRaw`
      SELECT ds.id, ds.date, i.itemName, ds.quantity, ds.reason, ds.responsiblePerson, ds.amountLoss, ds.approvalStatus
      FROM store_damaged_stock ds
      JOIN store_items i ON i.id = ds.itemId
      WHERE ds.tenant_id = ${resolvedTenantId}
        AND i.tenant_id = ${resolvedTenantId}
        AND (${branchId} IS NULL OR ds.branch_id = ${branchId})
        AND ds.status = 'active'
        AND (${fromDate} IS NULL OR ds.date >= ${fromDate})
        AND (${toDate} IS NULL OR ds.date <= ${toDate})
      ORDER BY ds.date DESC, ds.id DESC
    `;
    const items = mapReportRows(rows);
    return { items, summary: { amountLoss: items.reduce((sum, item) => sum + item.amountLoss, 0) } };
  },

  async getStoreValueReport(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const category = normalizeText(query.category);
    const stockQuantitySql = getBranchStockQuantitySql(resolvedTenantId, branchId);
    const rows = await prisma.$queryRaw`
      SELECT i.id, i.itemName, i.category, COALESCE(u.name, u.shortName, i.unit) AS unit, ${stockQuantitySql} AS currentStock,
             COALESCE(latest_purchase.rate, i.purchasePrice) AS purchasePrice,
             (${stockQuantitySql} * COALESCE(latest_purchase.rate, i.purchasePrice)) AS totalValue
      FROM store_items i
      LEFT JOIN store_purchase_items latest_purchase ON latest_purchase.id = (
        SELECT pi.id
        FROM store_purchase_items pi
        JOIN store_purchases p ON p.id = pi.purchaseId
        WHERE pi.itemId = i.id
          AND pi.tenant_id = ${resolvedTenantId}
          AND p.tenant_id = ${resolvedTenantId}
          AND (${branchId} IS NULL OR pi.branch_id = ${branchId})
          AND (${branchId} IS NULL OR p.branch_id = ${branchId})
          AND p.status = 'active'
          AND p.approvalStatus = 'approved'
        ORDER BY p.purchaseDate DESC, pi.id DESC
        LIMIT 1
      )
      LEFT JOIN store_units u ON u.id = latest_purchase.unitId AND u.tenant_id = ${resolvedTenantId}
      WHERE i.tenant_id = ${resolvedTenantId} AND i.status = 'active' AND (${category} = '' OR i.category = ${category})
      ORDER BY totalValue DESC
    `;
    const items = mapReportRows(rows);
    return { items, summary: { totalItems: items.length, totalValue: items.reduce((sum, item) => sum + item.totalValue, 0) } };
  },

  async getItemLedgerReport(tenantId, itemId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const normalizedItemId = normalizeId(itemId);
    const { fromDate, toDate } = getReportDateRange(query);
    const rows = await prisma.$queryRaw`
      SELECT ledgerDate, sourceType, referenceNo, inQuantity, outQuantity, note
      FROM (
        SELECT p.purchaseDate AS ledgerDate, 'purchase' AS sourceType, p.invoiceNumber AS referenceNo, pi.quantity AS inQuantity, 0 AS outQuantity, s.supplierName AS note
        FROM store_purchase_items pi
        JOIN store_purchases p ON p.id = pi.purchaseId
        JOIN store_suppliers s ON s.id = p.supplierId
        WHERE pi.itemId = ${normalizedItemId} AND pi.tenant_id = ${resolvedTenantId} AND p.tenant_id = ${resolvedTenantId} AND s.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR pi.branch_id = ${branchId}) AND (${branchId} IS NULL OR p.branch_id = ${branchId}) AND p.status = 'active'
        UNION ALL
        SELECT si.issueDate, 'issue', CAST(si.id AS CHAR), 0, si.quantity, si.department
        FROM store_stock_issues si
        WHERE si.itemId = ${normalizedItemId} AND si.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR si.branch_id = ${branchId}) AND si.status = 'active' AND si.approvalStatus = 'approved'
        UNION ALL
        SELECT r.createdAt, 'return', CAST(r.id AS CHAR), CASE WHEN r.condition = 'good' AND r.addToStock = true THEN r.returnQuantity ELSE 0 END, 0, r.note
        FROM store_returns r
        WHERE r.itemId = ${normalizedItemId} AND r.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR r.branch_id = ${branchId}) AND r.status = 'active'
        UNION ALL
        SELECT ds.date, 'damaged', CAST(ds.id AS CHAR), 0, ds.quantity, ds.reason
        FROM store_damaged_stock ds
        WHERE ds.itemId = ${normalizedItemId} AND ds.tenant_id = ${resolvedTenantId} AND (${branchId} IS NULL OR ds.branch_id = ${branchId}) AND ds.status = 'active' AND ds.approvalStatus = 'approved' AND ds.returnId IS NULL
      ) ledger
      WHERE (${fromDate} IS NULL OR ledgerDate >= ${fromDate}) AND (${toDate} IS NULL OR ledgerDate <= ${toDate})
      ORDER BY ledgerDate ASC
    `;
    let balanceQuantity = 0;
    const items = mapReportRows(rows).map((row) => {
      balanceQuantity += reportNumber(row.inQuantity) - reportNumber(row.outQuantity);
      return { ...row, balanceQuantity };
    });
    return { items, summary: { balanceQuantity } };
  },
};

