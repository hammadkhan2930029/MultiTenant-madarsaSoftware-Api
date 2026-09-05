import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { getNextFamilyNumber } from '../../utils/familyNumber.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { assignParentRegistrationNumber } from '../../utils/parentRegistrationNumber.js';
import { branchScopeService, classScopeService } from '../security/index.js';

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

const buildStudentClassScopeWhere = (branchScope = null) => (
  classScopeService.isRestricted(branchScope)
    ? {
        assignments: {
          some: {
            status: 'active',
            classId: { in: classScopeService.normalizeClassIds(branchScope) },
          },
        },
      }
    : {}
);

const buildParentClassScopeWhere = (tenantId, branchScope = null) => (
  classScopeService.isRestricted(branchScope)
    ? {
        students: {
          some: {
            tenantId,
            student: buildStudentClassScopeWhere(branchScope),
          },
        },
      }
    : {}
);

const buildParentSelect = (tenantId, branchId, branchScope = null) => ({
  id: true,
  registrationNumber: true,
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
    ...((branchId || classScopeService.isRestricted(branchScope))
      ? {
          where: {
            tenantId,
            student: {
              ...buildStudentBranchVisibilityWhere(tenantId, branchId),
              ...buildStudentClassScopeWhere(branchScope),
            },
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

const resolveParentBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) =>
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });

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
    if (classScopeService.isRestricted(branchScope)) {
      throw new AppError('Create parents through a student in an assigned class.', 403);
    }
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveParentBranchId(resolvedTenantId, payload, branchScope);
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

    const createdParent = await prisma.$transaction(async (tx) => {
      const parent = await tx.parent.create({
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
        select: { id: true, familyNumber: true },
      });

      await assignParentRegistrationNumber(tx, resolvedTenantId, parent.id);
      return parent;
    });

    return prisma.parent.findUnique({
      where: { id: createdParent.id },
      select: buildParentSelect(resolvedTenantId, scopedBranchId, branchScope),
    });
  },

  async getParents(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const requestedBranchId = await resolveParentBranchId(resolvedTenantId, query, branchScope);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      AND: [
        buildParentBranchVisibilityWhere(resolvedTenantId, requestedBranchId),
        buildParentClassScopeWhere(resolvedTenantId, branchScope),
      ].filter((item) => Object.keys(item).length),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { registrationNumber: { contains: query.search } },
              { familyNumber: { contains: query.search } },
              { phone: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
      status,
    };

    const [items, totalItems] = await Promise.all([
      prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: buildParentSelect(resolvedTenantId, requestedBranchId, branchScope),
      }),
      prisma.parent.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getParentById(tenantId, id, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveParentBranchId(resolvedTenantId, query, branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildParentClassScopeWhere(resolvedTenantId, branchScope),
      },
      select: buildParentSelect(resolvedTenantId, scopedBranchId, branchScope),
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    return parent;
  },

  async updateParent(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveParentBranchId(resolvedTenantId, payload, branchScope);
    const existingParent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildParentClassScopeWhere(resolvedTenantId, branchScope),
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

    return prisma.$transaction(async (tx) => {
      const parent = await tx.parent.update({
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
        select: buildParentSelect(resolvedTenantId, scopedBranchId, branchScope),
      });

      if (payload.fullName !== existingParent.fullName) {
        await tx.student.updateMany({
          where: {
            tenantId: resolvedTenantId,
            parents: {
              some: {
                tenantId: resolvedTenantId,
                parentId: id,
                OR: [
                  { isPrimary: true },
                  { relationship: { in: ['والد', 'father'] } },
                ],
              },
            },
          },
          data: { fatherName: payload.fullName },
        });
      }

      return parent;
    });
  },

  async deactivateParent(tenantId, id, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveParentBranchId(resolvedTenantId, query, branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildParentClassScopeWhere(resolvedTenantId, branchScope),
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
      select: buildParentSelect(resolvedTenantId, scopedBranchId, branchScope),
    });
  },

  async deleteParent(tenantId, id, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveParentBranchId(resolvedTenantId, query, branchScope);
    const parent = await prisma.parent.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildParentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildParentClassScopeWhere(resolvedTenantId, branchScope),
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
      select: buildParentSelect(resolvedTenantId, scopedBranchId, branchScope),
    });
  },
};
