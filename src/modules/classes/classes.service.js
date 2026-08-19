import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
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
  inchargeTeacherId: true,
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
  inchargeTeacher: {
    select: {
      id: true,
      fullName: true,
      subject: true,
      status: true,
    },
  },
  _count: {
    select: {
      sections: true,
    },
  },
};

const buildClassBranchWhere = (branchId) => (
  { branchId: Number(branchId) }
);

const buildClassBranchData = (branchId) => (
  { branchId: Number(branchId) }
);

const validateBranchAccess = async (tenantId, branchId) => {
  if (!branchId) {
    throw new AppError('Branch context is required for class management.', 403);
  }

  return branchScopeService.validateBranchBelongsToTenant({
    tenantId,
    branchId,
    requireActive: true,
  });
};

const resolveClassBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });
};

const resolveInchargeTeacherId = async (tenantId, branchId, inchargeTeacherId) => {
  if (!inchargeTeacherId) return null;

  const teacher = await prisma.teacher.findFirst({
    where: {
      id: Number(inchargeTeacherId),
      tenantId,
      branchId,
      staffType: 'teacher',
      status: 'active',
    },
    select: { id: true },
  });

  if (!teacher) {
    throw new AppError('Selected class incharge must be an active teacher from the same branch.', 400);
  }

  return teacher.id;
};

export const classesService = {
  async createClass(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveClassBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);
    const inchargeTeacherId = await resolveInchargeTeacherId(resolvedTenantId, branchId, payload.inchargeTeacherId);

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
        inchargeTeacherId,
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
        inchargeTeacherId: item.inchargeTeacherId ? Number(item.inchargeTeacherId) : null,
      }))
      .filter((item) => item.name);

    if (!normalizedRows.length) {
      throw new AppError('Ú©Ù… Ø§Ø² Ú©Ù… Ø§ÛŒÚ© Ø¬Ù…Ø§Ø¹Øª Ú©Ø§ Ù†Ø§Ù… Ø¯Ø±Ø¬ Ú©Ø±ÛŒÚºÛ”', 400);
    }

    const seenNames = new Map();
    const rowErrors = [];

    normalizedRows.forEach((row) => {
      const key = row.name.toLowerCase();
      if (seenNames.has(key)) {
        rowErrors.push({
          index: row.index,
          message: 'ÛŒÛ Ø¬Ù…Ø§Ø¹Øª Ø§Ø³ÛŒ ÙØ§Ø±Ù… Ù…ÛŒÚº Ø¯ÙˆØ¨Ø§Ø±Û Ø¯Ø±Ø¬ ÛÛ’Û”',
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
          message: 'ÛŒÛ Ø¬Ù…Ø§Ø¹Øª Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”',
        });
      }
    });

    if (rowErrors.length) {
      throw new AppError('Ø¯Ø±Ø¬ Ú©Ø±Ø¯Û Ø¬Ù…Ø§Ø¹ØªÙˆÚº Ù…ÛŒÚº ØºÙ„Ø·ÛŒ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”', 409, { rows: rowErrors });
    }

    const requestedTeacherIds = [...new Set(normalizedRows.map((row) => row.inchargeTeacherId).filter(Boolean))];
    if (requestedTeacherIds.length) {
      const validTeachers = await prisma.teacher.findMany({
        where: {
          id: { in: requestedTeacherIds },
          tenantId: resolvedTenantId,
          branchId,
          staffType: 'teacher',
          status: 'active',
        },
        select: { id: true },
      });
      const validTeacherIds = new Set(validTeachers.map((teacher) => teacher.id));
      normalizedRows.forEach((row) => {
        if (row.inchargeTeacherId && !validTeacherIds.has(row.inchargeTeacherId)) {
          rowErrors.push({
            index: row.index,
            message: 'Selected class incharge must be an active teacher from the same branch.',
          });
        }
      });
    }

    if (rowErrors.length) {
      throw new AppError('The submitted classes contain invalid information.', 400, { rows: rowErrors });
    }

    return prisma.$transaction(async (tx) => {
      const createdClasses = [];

      for (const row of normalizedRows) {
        const createdClass = await tx.academicClass.create({
          data: {
            tenantId: resolvedTenantId,
            ...buildClassBranchData(branchId),
            name: row.name,
            inchargeTeacherId: row.inchargeTeacherId,
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
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
      status,
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
    const requestedInchargeTeacherId = payload.inchargeTeacherId === undefined
      ? academicClass.inchargeTeacherId
      : payload.inchargeTeacherId;
    const inchargeTeacherId = await resolveInchargeTeacherId(resolvedTenantId, branchId, requestedInchargeTeacherId);

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
        inchargeTeacherId,
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
