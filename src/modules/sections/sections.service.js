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

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const getClassBranchWhere = (branchId) => (branchId ? { class: { branchId } } : {});

export const sectionsService = {
  async createSection(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const academicClass = await prisma.academicClass.findFirst({
      where: {
        id: payload.classId,
        tenantId: resolvedTenantId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        branch: { status: 'active' },
      },
    });

    if (!academicClass) {
      throw new AppError('Selected class or branch is inactive or not available.', 403);
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

  async bulkCreateSections(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const academicClass = await prisma.academicClass.findFirst({
      where: {
        id: payload.classId,
        tenantId: resolvedTenantId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        branch: { status: 'active' },
      },
      select: { id: true },
    });

    if (!academicClass) {
      throw new AppError('Selected class or branch is inactive or not available.', 403);
    }

    const normalizedRows = payload.sections
      .map((item, index) => ({
        index,
        name: String(item.name || '').trim(),
      }))
      .filter((item) => item.name);

    if (!normalizedRows.length) {
      throw new AppError('کم از کم ایک سیکشن کا نام درج کریں۔', 400);
    }

    const rowErrors = [];
    const seenNames = new Map();

    normalizedRows.forEach((row) => {
      const key = row.name.toLowerCase();
      if (seenNames.has(key)) {
        rowErrors.push({
          index: row.index,
          message: 'یہ سیکشن اسی فارم میں دوبارہ درج ہے۔',
        });
      } else {
        seenNames.set(key, row.index);
      }
    });

    const existingSections = await prisma.section.findMany({
      where: {
        tenantId: resolvedTenantId,
        classId: payload.classId,
        name: { in: normalizedRows.map((row) => row.name) },
      },
      select: { name: true },
    });
    const existingNames = new Set(existingSections.map((item) => item.name.toLowerCase()));

    normalizedRows.forEach((row) => {
      if (existingNames.has(row.name.toLowerCase())) {
        rowErrors.push({
          index: row.index,
          message: 'یہ سیکشن اس جماعت میں پہلے سے موجود ہے۔',
        });
      }
    });

    if (rowErrors.length) {
      throw new AppError('درج کردہ سیکشنز میں غلطی موجود ہے۔', 409, { rows: rowErrors });
    }

    return prisma.$transaction(async (tx) => {
      const createdSections = [];

      for (const row of normalizedRows) {
        const createdSection = await tx.section.create({
          data: {
            tenantId: resolvedTenantId,
            classId: payload.classId,
            name: row.name,
          },
          select: sectionSelect,
        });
        createdSections.push(createdSection);
      }

      return {
        items: createdSections,
        createdCount: createdSections.length,
      };
    });
  },

  async getSections(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getScopedBranchId(branchScope) || query.branchId || null;

    const where = {
      tenantId: resolvedTenantId,
      ...getClassBranchWhere(branchId),
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

  async getSectionById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId, ...getClassBranchWhere(branchId) },
      select: sectionSelect,
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    return section;
  },

  async updateSection(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId, ...getClassBranchWhere(branchId) },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const academicClass = await prisma.academicClass.findFirst({
      where: {
        id: payload.classId,
        tenantId: resolvedTenantId,
        ...(branchId ? { branchId } : {}),
        branch: { status: 'active' },
      },
    });

    if (!academicClass) {
      throw new AppError('Selected class or branch is inactive or not available.', 403);
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

  async deleteSection(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const section = await prisma.section.findFirst({
      where: { id, tenantId: resolvedTenantId, ...getClassBranchWhere(branchId) },
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
