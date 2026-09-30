import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { auditService, branchScopeService } from '../../security/index.js';

const select = {
  id: true,
  tenantId: true,
  branchId: true,
  collectionGroupId: true,
  donorName: true,
  careOf: true,
  phone: true,
  paymentMode: true,
  donationType: true,
  donationSubType: true,
  purpose: true,
  amount: true,
  receiptNo: true,
  details: true,
  paymentDate: true,
  chequeDate: true,
  chequeBankName: true,
  chequeBranchCode: true,
  chequeNumber: true,
  onlineWalletOrBank: true,
  onlineReferenceNo: true,
  paymentProofUrl: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEndDate = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const resolveBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, payloadOrQuery, branchScope, {
    requireActive: true,
  });
};

const getTenantFundCollection = async (tenantId, id, branchId = null) => {
  const entry = await prisma.fundCollection.findFirst({
    where: { id, tenantId, ...(branchId ? { branchId } : {}) },
    select,
  });

  if (!entry) {
    throw new AppError('Fund collection record not found.', 404);
  }

  return entry;
};

export const fundCollectionsService = {
  async createEntry(tenantId, payload, branchScope = null, proofFile = null, auditContext = {}) {
    if (['چیک', 'آن لائن'].includes(payload.paymentMode) && !proofFile) {
      throw new AppError('چیک یا آن لائن ادائیگی کے لیے ثبوت کی تصویر ضروری ہے۔', 400);
    }
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);

    const entry = await prisma.fundCollection.create({
      data: {
        ...payload,
        tenantId: resolvedTenantId,
        branchId,
        paymentDate: normalizeDate(payload.paymentDate),
        chequeDate: payload.paymentMode === 'چیک' ? normalizeDate(payload.chequeDate) : null,
        chequeBankName: payload.paymentMode === 'چیک' ? payload.chequeBankName || payload.bankName || null : null,
        chequeBranchCode: payload.paymentMode === 'چیک' ? payload.chequeBranchCode || payload.branchCode || null : null,
        chequeNumber: payload.paymentMode === 'چیک' ? payload.chequeNumber || payload.chequeNo || null : null,
        onlineWalletOrBank: payload.paymentMode === 'آن لائن' ? payload.onlineWalletOrBank || null : null,
        onlineReferenceNo: payload.paymentMode === 'آن لائن' ? payload.onlineReferenceNo || null : null,
        paymentProofUrl: proofFile ? `/uploads/fund-collection-proofs/${proofFile.filename}` : null,
        remarks: payload.remarks || null,
      },
      select,
    });
    await auditService.recordAuditLog(prisma, { tenantId: resolvedTenantId, actorUserId: auditContext.actorUserId || null, branchId: entry.branchId || branchId || null, roleId: auditContext.roleId || null, action: 'finance.fund_collection.created', module: 'finance', targetType: 'fund_collection', targetId: entry.id, oldValue: null, newValue: entry, ipAddress: auditContext.ipAddress || null, userAgent: auditContext.userAgent || null });
    return entry;
  },

  async getEntries(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.donationType ? { donationType: query.donationType } : {}),
      ...(query.donationSubType ? { donationSubType: query.donationSubType } : {}),
      ...(query.phone ? { phone: query.phone } : {}),
      ...(query.collectionGroupId ? { collectionGroupId: query.collectionGroupId } : {}),
      ...(query.search
        ? {
            OR: [
              { donorName: { contains: query.search } },
              { careOf: { contains: query.search } },
              { phone: { contains: query.search } },
              { donationType: { contains: query.search } },
              { donationSubType: { contains: query.search } },
              { purpose: { contains: query.search } },
              { receiptNo: { contains: query.search } },
              { collectionGroupId: { contains: query.search } },
              { details: { contains: query.search } },
              { remarks: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            paymentDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeEndDate(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.fundCollection.findMany({ where, skip, take: limit, orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }], select }),
      prisma.fundCollection.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, {}, branchScope);
    return getTenantFundCollection(resolvedTenantId, id, branchId);
  },

  async updateEntry(tenantId, id, payload, branchScope = null, proofFile = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const existing = await getTenantFundCollection(resolvedTenantId, id, branchId);
    if (['چیک', 'آن لائن'].includes(payload.paymentMode) && !proofFile && !existing.paymentProofUrl) {
      throw new AppError('چیک یا آن لائن ادائیگی کے لیے ثبوت کی تصویر ضروری ہے۔', 400);
    }

    const { editReason, ...updatePayload } = payload;
    const entry = await prisma.fundCollection.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        ...updatePayload,
        branchId,
        paymentDate: normalizeDate(payload.paymentDate),
        chequeDate: payload.paymentMode === 'چیک' ? normalizeDate(payload.chequeDate) : null,
        chequeBankName: payload.paymentMode === 'چیک' ? payload.chequeBankName || payload.bankName || null : null,
        chequeBranchCode: payload.paymentMode === 'چیک' ? payload.chequeBranchCode || payload.branchCode || null : null,
        chequeNumber: payload.paymentMode === 'چیک' ? payload.chequeNumber || payload.chequeNo || null : null,
        onlineWalletOrBank: payload.paymentMode === 'آن لائن' ? payload.onlineWalletOrBank || null : null,
        onlineReferenceNo: payload.paymentMode === 'آن لائن' ? payload.onlineReferenceNo || null : null,
        paymentProofUrl: proofFile ? `/uploads/fund-collection-proofs/${proofFile.filename}` : existing.paymentProofUrl,
        remarks: payload.remarks || null,
        status: payload.status || existing.status,
      },
      select,
    });
    await auditService.recordAuditLog(prisma, {
      tenantId: resolvedTenantId, actorUserId: auditContext.actorUserId || null, branchId: entry.branchId || branchId || null, roleId: auditContext.roleId || null,
      action: 'finance.fund_collection.updated', module: 'finance', targetType: 'fund_collection', targetId: entry.id,
      oldValue: existing, newValue: { ...entry, editReason }, ipAddress: auditContext.ipAddress || null, userAgent: auditContext.userAgent || null,
    });
    return entry;
  },

  async deactivateEntry(tenantId, id, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, {}, branchScope);
    const existing = await getTenantFundCollection(resolvedTenantId, id, branchId);
    const entry = await prisma.fundCollection.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
    await auditService.recordAuditLog(prisma, { tenantId: resolvedTenantId, actorUserId: auditContext.actorUserId || null, branchId: entry.branchId || branchId || null, roleId: auditContext.roleId || null, action: 'finance.fund_collection.deleted', module: 'finance', targetType: 'fund_collection', targetId: entry.id, oldValue: existing, newValue: entry, ipAddress: auditContext.ipAddress || null, userAgent: auditContext.userAgent || null });
    return entry;
  },

  async recordPrint(tenantId, id, branchScope = null, auditContext = {}) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, {}, branchScope);
    const entry = await getTenantFundCollection(resolvedTenantId, id, branchId);
    await auditService.recordAuditLog(prisma, { tenantId: resolvedTenantId, actorUserId: auditContext.actorUserId || null, branchId: entry.branchId || branchId || null, roleId: auditContext.roleId || null, action: 'finance.fund_collection.printed', module: 'finance', targetType: 'fund_collection', targetId: entry.id, oldValue: null, newValue: { id: entry.id, printedAt: new Date().toISOString() }, ipAddress: auditContext.ipAddress || null, userAgent: auditContext.userAgent || null });
    return entry;
  },
};
