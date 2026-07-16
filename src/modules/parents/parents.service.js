import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { getNextFamilyNumber } from '../../utils/familyNumber.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService } from '../security/index.js';

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const buildStudentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};

  return {
    OR: [
      { branchId },
      {
        assignments: {
          some: {
            tenantId,
            branchId,
            status: 'active',
          },
        },
      },
    ],
  };
};

const buildParentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};

  return {
    OR: [
      { branchId },
      {
        students: {
          some: {
            tenantId,
            student: buildStudentBranchVisibilityWhere(tenantId, branchId),
          },
        },
      },
    ],
  };
};

const buildParentSelect = (tenantId, branchId) => ({
  id: true,
  tenantId: true,
  branchId: true,
  fullName: true,
  familyNumber: true,
  phone: true,
  whatsapp: true,
  email: true,
  cnic: true,
  occupation: true,
  address: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  students: {
    ...(branchId
      ? {
          where: {
            tenantId,
            student: buildStudentBranchVisibilityWhere(tenantId, branchId),
          },
        }
      : {}),
    select: {
      relationship: true,
      isPrimary: true,
      student: {
        select: {
          id: true,
          admissionNumber: true,
          fullName: true,
          status: true,
        },
      },
    },
  },
});

const normalizeTenantId = (tenantId) => {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isInteger(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new AppError('Tenant context is required for parents.', 403);
  }

  return normalizedTenantId;
};

const ensureFamilyNumberUnique = async (tenantId, familyNumber, excludeId) => {
  if (!familyNumber) return;

  const existingParent = await prisma.parent.findFirst({
    where: {
      tenantId,
      familyNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existingParent) {
    throw new AppError('Family number already exists.', 409);
  }
};

const buildDuplicateParentWhere = (tenantId, payload, excludeId) => ({
  AND: [
    { tenantId },
    { fullName: payload.fullName },
    {
      OR: [
        ...(payload.phone ? [{ phone: payload.phone }] : []),
        ...(payload.email ? [{ email: payload.email }] : []),
      ],
    },
    ...(excludeId ? [{ id: { not: excludeId } }] : []),
  ],
});

export const parentsService = {
  async createParent(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    if (scopedBranchId) {
      await branchScopeService.validateBranchBelongsToTenant({
        tenantId: resolvedTenantId,
        branchId: scopedBranchId,
        requireActive: true,
      });
    }
    const familyNumber = payload.familyNumber || (await getNextFamilyNumber(resolvedTenantId));

    await ensureFamilyNumberUnique(resolvedTenantId, familyNumber);

    if (payload.phone || payload.email) {
      const duplicateParent = await prisma.parent.findFirst({
        where: buildDuplicateParentWhere(resolvedTenantId, payload),
      });

      if (duplicateParent) {
        throw new AppError('Parent with similar details already exists.', 409);
      }
    }

    const createdParent = await prisma.parent.create({
      data: {
        tenantId: resolvedTenantId,
        branchId: scopedBranchId,
        fullName: payload.fullName,
        familyNumber,
        phone: payload.phone || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        cnic: payload.cnic || null,
        occupation: payload.occupation || null,
        address: payload.address || null,
      },
      select: {
        id: true,
        familyNumber: true,
      },
    });

    return prisma.parent.findUnique({
      where: { id: createdParent.id },
      select: buildParentSelect(resolvedTenantId, scopedBranchId),
    });
  },

  async getParents(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const scopedBranchId = getScopedBranchId(branchScope);
    const requestedBranchId = query.branchId || scopedBranchId;

    if (requestedBranchId) {
      await branchScopeService.validateBranchBelongsToTenant({
        tenantId: resolvedTenantId,
        branchId: requestedBranchId,
        requireActive: true,
      });
    }

    const where = {
      tenantId: resolvedTenantId,
      AND: [
        buildParentBranchVisibilityWhere(resolvedTenantId, requestedBranchId),
      ].filter((item) => Object.keys(item).length),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { familyNumber: { contains: query.search } },
              { phone: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: buildParentSelect(resolvedTenantId, requestedBranchId),
      }),
      prisma.parent.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getParentById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
      select: buildParentSelect(resolvedTenantId, scopedBranchId),
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    return parent;
  },

  async updateParent(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const existingParent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
    });

    if (!existingParent) {
      throw new AppError('Parent not found.', 404);
    }

    await ensureFamilyNumberUnique(resolvedTenantId, payload.familyNumber, id);

    if (payload.phone || payload.email) {
      const duplicateParent = await prisma.parent.findFirst({
        where: buildDuplicateParentWhere(resolvedTenantId, payload, id),
      });

      if (duplicateParent) {
        throw new AppError('Another parent with similar details already exists.', 409);
      }
    }

    return prisma.parent.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        fullName: payload.fullName,
        familyNumber: payload.familyNumber || existingParent.familyNumber,
        phone: payload.phone || null,
        whatsapp: payload.whatsapp || null,
        email: payload.email || null,
        cnic: payload.cnic || null,
        occupation: payload.occupation || null,
        address: payload.address || null,
        status: payload.status || existingParent.status,
      },
      select: buildParentSelect(resolvedTenantId, scopedBranchId),
    });
  },

  async deactivateParent(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    if (parent.status === 'inactive') {
      throw new AppError('Parent is already inactive.', 400);
    }

    return prisma.parent.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: buildParentSelect(resolvedTenantId, scopedBranchId),
    });
  },

  async deleteParent(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
      select: {
        id: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    if ((parent._count?.students || 0) > 0) {
      throw new AppError('This parent cannot be deleted because linked students exist.', 400);
    }

    return prisma.parent.delete({
      where: { id, tenantId: resolvedTenantId },
      select: buildParentSelect(resolvedTenantId, scopedBranchId),
    });
  },
};
