import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService } from '../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const classSelect = {
  id: true,
  tenantId: true,
  name: true,
  branchId: true,
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
  _count: {
    select: {
      sections: true,
    },
  },
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const getRequestedBranchId = (queryOrPayload = {}, branchScope = null) =>
  getScopedBranchId(branchScope) || queryOrPayload.branchId || null;

const buildClassBranchWhere = (branchId) => (
  branchId ? { branchId } : { branchId: null }
);

const buildClassBranchData = (branchId) => (
  branchId ? { branchId } : {}
);

const validateBranchAccess = async (tenantId, branchId) => {
  if (!branchId) return null;

  return branchScopeService.validateBranchBelongsToTenant({
    tenantId,
    branchId,
    requireActive: true,
  });
};

const resolveClassBranchId = async (_tenantId, queryOrPayload = {}, branchScope = null) => {
  const branchId = getRequestedBranchId(queryOrPayload, branchScope);
  return branchId ? Number(branchId) : null;
};

export const classesService = {
  async createClass(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        tenantId: resolvedTenantId,
        ...buildClassBranchWhere(branchId),
        name: payload.name,
      },
    });

    if (duplicateClass) {
      throw new AppError('Class with the same name already exists in this branch.', 409);
    }

    return prisma.academicClass.create({
      data: {
        tenantId: resolvedTenantId,
        name: payload.name,
        ...buildClassBranchData(branchId),
      },
      select: classSelect,
    });
  },

  async bulkCreateClasses(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const normalizedRows = payload.classes
      .map((item, index) => ({
        index,
        name: String(item.name || '').trim(),
      }))
      .filter((item) => item.name);

    if (!normalizedRows.length) {
      throw new AppError('کم از کم ایک جماعت کا نام درج کریں۔', 400);
    }

    const seenNames = new Map();
    const rowErrors = [];

    normalizedRows.forEach((row) => {
      const key = row.name.toLowerCase();
      if (seenNames.has(key)) {
        rowErrors.push({
          index: row.index,
          message: 'یہ جماعت اسی فارم میں دوبارہ درج ہے۔',
        });
      } else {
        seenNames.set(key, row.index);
      }
    });

    const existingClasses = await prisma.academicClass.findMany({
      where: {
        tenantId: resolvedTenantId,
        ...buildClassBranchWhere(branchId),
        name: { in: normalizedRows.map((row) => row.name) },
      },
      select: { name: true },
    });
    const existingNames = new Set(existingClasses.map((item) => item.name.toLowerCase()));

    normalizedRows.forEach((row) => {
      if (existingNames.has(row.name.toLowerCase())) {
        rowErrors.push({
          index: row.index,
          message: 'یہ جماعت پہلے سے موجود ہے۔',
        });
      }
    });

    if (rowErrors.length) {
      throw new AppError('درج کردہ جماعتوں میں غلطی موجود ہے۔', 409, { rows: rowErrors });
    }

    return prisma.$transaction(async (tx) => {
      const createdClasses = [];

      for (const row of normalizedRows) {
        const createdClass = await tx.academicClass.create({
          data: {
            tenantId: resolvedTenantId,
            ...buildClassBranchData(branchId),
            name: row.name,
          },
          select: classSelect,
        });
        createdClasses.push(createdClass);
      }

      return {
        items: createdClasses,
        createdCount: createdClasses.length,
      };
    });
  },

  async getClasses(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = await resolveClassBranchId(resolvedTenantId, query, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      branchId,
    };

    const [items, totalItems] = await Promise.all([
      prisma.academicClass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: classSelect,
      }),
      prisma.academicClass.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getClassById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, {}, branchScope);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId, branchId },
      select: {
        ...classSelect,
        sections: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    return academicClass;
  },

  async updateClass(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, payload, branchScope);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId, branchId },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    await validateBranchAccess(resolvedTenantId, branchId);

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        tenantId: resolvedTenantId,
        id: { not: id },
        ...buildClassBranchWhere(branchId),
        name: payload.name,
      },
    });

    if (duplicateClass) {
      throw new AppError('Another class with the same name already exists in this branch.', 409);
    }

    return prisma.academicClass.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        name: payload.name,
        ...buildClassBranchWhere(branchId),
        status: payload.status || academicClass.status,
      },
      select: classSelect,
    });
  },

  async deleteClass(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, {}, branchScope);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId, branchId },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    const relatedRecords = await prisma.academicClass.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            sections: true,
            assignments: true,
            studentAttendances: true,
          },
        },
      },
    });

    const hasDependencies =
      (relatedRecords?._count?.sections || 0) > 0 ||
      (relatedRecords?._count?.assignments || 0) > 0 ||
      (relatedRecords?._count?.studentAttendances || 0) > 0;

    if (hasDependencies) {
      throw new AppError('This class cannot be deleted because related records exist.', 400);
    }

    return prisma.academicClass.delete({
      where: { id, tenantId: resolvedTenantId },
      select: classSelect,
    });
  },
};
