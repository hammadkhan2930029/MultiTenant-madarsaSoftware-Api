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

const sectionSelect = {
  id: true,
  tenantId: true,
  name: true,
  classId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  class: {
    select: {
      id: true,
      name: true,
      status: true,
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
};

export const sectionsService = {
  async createSection(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const academicClass = await prisma.academicClass.findFirst({
      where: { id: payload.classId, tenantId: resolvedTenantId },
    });

    if (!academicClass) {
      throw new AppError('Selected class not found.', 404);
    }

    const duplicateSection = await prisma.section.findFirst({
      where: {
        tenantId: resolvedTenantId,
        classId: payload.classId,
        name: payload.name,
      },
    });

    if (duplicateSection) {
      throw new AppError('Section with the same name already exists in this class.', 409);
    }

    return prisma.section.create({
      data: {
        tenantId: resolvedTenantId,
        name: payload.name,
        classId: payload.classId,
      },
      select: sectionSelect,
    });
  },

  async getSections(tenantId, query) {
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
      ...(query.classId ? { classId: query.classId } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.section.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: sectionSelect,
      }),
      prisma.section.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getSectionById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId },
      select: sectionSelect,
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    return section;
  },

  async updateSection(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const academicClass = await prisma.academicClass.findFirst({
      where: { id: payload.classId, tenantId: resolvedTenantId },
    });

    if (!academicClass) {
      throw new AppError('Selected class not found.', 404);
    }

    const duplicateSection = await prisma.section.findFirst({
      where: {
        tenantId: resolvedTenantId,
        id: { not: id },
        classId: payload.classId,
        name: payload.name,
      },
    });

    if (duplicateSection) {
      throw new AppError('Another section with the same name already exists in this class.', 409);
    }

    return prisma.section.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        name: payload.name,
        classId: payload.classId,
        status: payload.status || section.status,
      },
      select: sectionSelect,
    });
  },

  async deleteSection(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const relatedRecords = await prisma.section.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            assignments: true,
            studentAttendances: true,
          },
        },
      },
    });

    const hasDependencies =
      (relatedRecords?._count?.assignments || 0) > 0 ||
      (relatedRecords?._count?.studentAttendances || 0) > 0;

    if (hasDependencies) {
      throw new AppError('This section cannot be deleted because related records exist.', 400);
    }

    return prisma.section.delete({
      where: { id, tenantId: resolvedTenantId },
      select: sectionSelect,
    });
  },
};
