import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { normalizeTenantId } from '../../utils/tenantGuard.js';
import { branchScopeService } from '../security/index.js';

const shiftSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  startTime: true,
  endTime: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
};

const resolveShiftBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });
};

const normalizeShiftType = (type) => String(type || '').trim() || 'Custom';

const getScopedShift = async (tenantId, id, branchId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: Number(id), tenantId, branchId },
    select: shiftSelect,
  });

  if (!shift) {
    throw new AppError('Shift not found.', 404);
  }

  return shift;
};

export const shiftsService = {
  async createShift(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, payload, branchScope);

    const existingShift = await prisma.shift.findFirst({
      where: { tenantId: resolvedTenantId, branchId, name: payload.name },
    });

    if (existingShift) {
      throw new AppError('Shift with the same name already exists in this branch.', 409);
    }

    return prisma.shift.create({
      data: {
        tenantId: resolvedTenantId,
        branchId,
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        type: normalizeShiftType(payload.type),
        status: payload.status || 'active',
      },
      select: shiftSelect,
    });
  },

  async bulkCreateShifts(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, payload, branchScope);
    const normalizedRows = payload.shifts
      .map((item, index) => ({
        index,
        name: String(item.name || '').trim(),
        startTime: item.startTime,
        endTime: item.endTime,
        type: normalizeShiftType(item.type),
        status: item.status || 'active',
      }))
      .filter((item) => item.name || item.startTime || item.endTime);

    if (!normalizedRows.length) {
      throw new AppError('Ú©Ù… Ø§Ø² Ú©Ù… Ø§ÛŒÚ© Ø´ÙÙ¹ Ú©ÛŒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¯Ø±Ø¬ Ú©Ø±ÛŒÚºÛ”', 400);
    }

    const rowErrors = [];
    const seenNames = new Map();

    normalizedRows.forEach((row) => {
      if (!row.name) {
        rowErrors.push({ index: row.index, message: 'Ø´ÙÙ¹ Ú©Ø§ Ù†Ø§Ù… Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’Û”' });
      }
      if (!row.startTime || !row.endTime) {
        rowErrors.push({ index: row.index, message: 'Ø´ÙÙ¹ Ú©Û’ Ø§ÙˆÙ‚Ø§Øª Ø¯Ø±Ø¬ Ú©Ø±ÛŒÚºÛ”' });
      }

      const key = row.name.toLowerCase();
      if (row.name && seenNames.has(key)) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´ÙÙ¹ Ø§Ø³ÛŒ ÙØ§Ø±Ù… Ù…ÛŒÚº Ø¯ÙˆØ¨Ø§Ø±Û Ø¯Ø±Ø¬ ÛÛ’Û”' });
      } else if (row.name) {
        seenNames.set(key, row.index);
      }
    });

    const existingShifts = await prisma.shift.findMany({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        name: { in: normalizedRows.map((row) => row.name).filter(Boolean) },
      },
      select: { name: true },
    });
    const existingNames = new Set(existingShifts.map((item) => item.name.toLowerCase()));

    normalizedRows.forEach((row) => {
      if (existingNames.has(row.name.toLowerCase())) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´ÙÙ¹ Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”' });
      }
    });

    if (rowErrors.length) {
      throw new AppError('Ø¯Ø±Ø¬ Ú©Ø±Ø¯Û Ø´ÙÙ¹Ø³ Ù…ÛŒÚº ØºÙ„Ø·ÛŒ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”', 409, { rows: rowErrors });
    }

    return prisma.$transaction(async (tx) => {
      const createdShifts = [];

      for (const row of normalizedRows) {
        const createdShift = await tx.shift.create({
          data: {
            tenantId: resolvedTenantId,
            branchId,
            name: row.name,
            startTime: row.startTime,
            endTime: row.endTime,
            type: row.type,
            status: row.status,
          },
          select: shiftSelect,
        });
        createdShifts.push(createdShift);
      }

      return {
        items: createdShifts,
        createdCount: createdShifts.length,
      };
    });
  },

  async getShifts(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      branchId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { type: { contains: query.search } },
            ],
          }
        : {}),
      status,
    };

    const [items, totalItems] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: shiftSelect,
      }),
      prisma.shift.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getShiftById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, {}, branchScope);
    return getScopedShift(resolvedTenantId, id, branchId);
  },

  async updateShift(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, payload, branchScope);
    const existingShift = await getScopedShift(resolvedTenantId, id, branchId);

    const duplicateShift = await prisma.shift.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        id: { not: Number(id) },
        name: payload.name,
      },
    });

    if (duplicateShift) {
      throw new AppError('Another shift with the same name already exists.', 409);
    }

    return prisma.shift.update({
      where: { id: Number(id) },
      data: {
        tenantId: resolvedTenantId,
        branchId,
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        type: normalizeShiftType(payload.type || existingShift.type),
        status: payload.status || existingShift.status,
      },
      select: shiftSelect,
    });
  },

  async deleteShift(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveShiftBranchId(resolvedTenantId, {}, branchScope);
    await getScopedShift(resolvedTenantId, id, branchId);

    return prisma.shift.delete({
      where: { id: Number(id) },
      select: shiftSelect,
    });
  },
};
