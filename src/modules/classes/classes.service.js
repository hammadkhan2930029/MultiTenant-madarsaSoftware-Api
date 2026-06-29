import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

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

export const classesService = {
  async createClass(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branch = await prisma.branch.findFirst({
      where: { id: payload.branchId, tenantId: resolvedTenantId },
    });

    if (!branch) {
      throw new AppError('Selected branch not found.', 404);
    }

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId: payload.branchId,
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
        branchId: payload.branchId,
      },
      select: classSelect,
    });
  },

  async getClasses(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);

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
      ...(query.branchId ? { branchId: query.branchId } : {}),
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

  async getClassById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId },
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

  async updateClass(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    const branch = await prisma.branch.findFirst({
      where: { id: payload.branchId, tenantId: resolvedTenantId },
    });

    if (!branch) {
      throw new AppError('Selected branch not found.', 404);
    }

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        tenantId: resolvedTenantId,
        id: { not: id },
        branchId: payload.branchId,
        name: payload.name,
      },
    });

    if (duplicateClass) {
      throw new AppError('Another class with the same name already exists in this branch.', 409);
    }

    return prisma.academicClass.update({
      where: { id },
      data: {
        name: payload.name,
        branchId: payload.branchId,
        status: payload.status || academicClass.status,
      },
      select: classSelect,
    });
  },

  async deleteClass(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id, tenantId: resolvedTenantId },
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
      where: { id },
      select: classSelect,
    });
  },
};
