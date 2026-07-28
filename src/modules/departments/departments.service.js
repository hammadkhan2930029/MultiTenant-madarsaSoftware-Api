import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { branchScopeService } from '../security/index.js';

const departmentSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  code: true,
  head: true,
  members: true,
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

const headTeacherSelect = {
  id: true,
  fullName: true,
  staffType: true,
  jobTitle: true,
  department: true,
  status: true,
  branchId: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  return Number.isInteger(resolvedTenantId) && resolvedTenantId > 0 ? resolvedTenantId : null;
};

const getBranchScopeKey = (branchScope = null) => {
  const branchId = branchScope?.branchId || branchScope?.resolvedBranchId || null;
  return branchId ? `branch:${branchId}` : 'tenant';
};

const resolveDepartmentBranchContext = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  if (!resolvedTenantId) {
    return { branchId: null, branchScopeKey: 'tenant' };
  }

  const branchId = await branchScopeService.resolveOperationalBranchId(
    resolvedTenantId,
    payloadOrQuery,
    branchScope,
    { requireActive: true }
  );

  return {
    branchId,
    branchScopeKey: branchId ? `branch:${branchId}` : 'tenant',
  };
};

const buildDepartmentSelect = (tenantId, branchScope = null) => {
  const resolvedTenantId = normalizeTenantId(tenantId);

  if (!resolvedTenantId) return departmentSelect;

  return {
    ...departmentSelect,
    headAssignments: {
      where: {
        tenantId: resolvedTenantId,
        branchScopeKey: getBranchScopeKey(branchScope),
      },
      select: {
        id: true,
        teacherId: true,
        branchId: true,
        branchScopeKey: true,
        teacher: {
          select: headTeacherSelect,
        },
      },
      take: 1,
    },
  };
};

const mapDepartment = (department) => {
  const assignment = department.headAssignments?.[0] || null;
  const { headAssignments, ...rest } = department;

  return {
    ...rest,
    head: assignment?.teacher?.fullName || rest.head,
    legacyHead: rest.head,
    headTeacherId: assignment?.teacherId || null,
    headTeacher: assignment?.teacher || null,
  };
};

const validateHeadTeacher = async (tenantId, headTeacherId, branchContext = null) => {
  if (!headTeacherId) return null;

  const resolvedTenantId = normalizeTenantId(tenantId);

  if (!resolvedTenantId) {
    throw new AppError('Tenant context is required to assign department head.', 403);
  }

  const branchId = branchContext?.branchId || null;
  const teacher = await prisma.teacher.findFirst({
    where: {
      id: Number(headTeacherId),
      tenantId: resolvedTenantId,
      status: 'active',
      ...(branchId ? { branchId } : {}),
    },
    select: headTeacherSelect,
  });

  if (!teacher) {
    throw new AppError('Selected department head is not available for this tenant or branch.', 403);
  }

  return teacher;
};

const syncHeadAssignment = async (tx, departmentId, tenantId, headTeacherId, branchContext = null) => {
  if (headTeacherId === undefined) return null;

  const resolvedTenantId = normalizeTenantId(tenantId);

  if (!resolvedTenantId) {
    if (headTeacherId === null || headTeacherId === '') return null;
    throw new AppError('Tenant context is required to assign department head.', 403);
  }

  const branchId = branchContext?.branchId || null;
  const branchScopeKey = branchContext?.branchScopeKey || getBranchScopeKey(branchContext);
  const existingAssignment = await tx.departmentHeadAssignment.findFirst({
    where: {
      departmentId,
      tenantId: resolvedTenantId,
      branchScopeKey,
    },
    select: { id: true },
  });

  if (headTeacherId === null || headTeacherId === '') {
    if (existingAssignment) {
      await tx.departmentHeadAssignment.delete({ where: { id: existingAssignment.id } });
    }
    return null;
  }

  const teacher = await validateHeadTeacher(resolvedTenantId, headTeacherId, branchContext);
  const data = {
    departmentId,
    tenantId: resolvedTenantId,
    branchId,
    branchScopeKey,
    teacherId: teacher.id,
  };

  if (existingAssignment) {
    return tx.departmentHeadAssignment.update({
      where: { id: existingAssignment.id },
      data,
    });
  }

  return tx.departmentHeadAssignment.create({ data });
};

export const departmentsService = {
  async createDepartment(tenantId, payload, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, payload, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingDepartment = await prisma.department.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId: branchContext.branchId,
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (existingDepartment) {
      throw new AppError('Department with the same name or code already exists.', 409);
    }

    const department = await prisma.$transaction(async (tx) => {
      const createdDepartment = await tx.department.create({
        data: {
          name: payload.name,
          tenantId: resolvedTenantId,
          branchId: branchContext.branchId,
          code: payload.code || null,
          head: payload.head || null,
          members: payload.members ?? 0,
          status: payload.status || 'active',
        },
        select: departmentSelect,
      });

      await syncHeadAssignment(tx, createdDepartment.id, tenantId, payload.headTeacherId, branchContext);

      return tx.department.findUnique({
        where: { id: createdDepartment.id },
        select: buildDepartmentSelect(tenantId, branchContext),
      });
    });

    return mapDepartment(department);
  },

  async bulkCreateDepartments(tenantId, payload, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, payload, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const normalizedRows = payload.departments
      .map((item, index) => ({
        index,
        name: String(item.name || '').trim(),
        code: String(item.code || '').trim(),
        head: String(item.head || '').trim(),
        headTeacherId: item.headTeacherId ?? null,
        members: item.members ?? 0,
        status: item.status || 'active',
      }))
      .filter((item) => item.name || item.code || item.head || item.headTeacherId);

    if (!normalizedRows.length) {
      throw new AppError('Ú©Ù… Ø§Ø² Ú©Ù… Ø§ÛŒÚ© Ø´Ø¹Ø¨Û Ú©ÛŒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¯Ø±Ø¬ Ú©Ø±ÛŒÚºÛ”', 400);
    }

    const rowErrors = [];
    const seenNames = new Map();
    const seenCodes = new Map();

    normalizedRows.forEach((row) => {
      if (!row.name) {
        rowErrors.push({ index: row.index, message: 'Ø´Ø¹Ø¨Û Ú©Ø§ Ù†Ø§Ù… Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’Û”' });
      }

      const nameKey = row.name.toLowerCase();
      if (row.name && seenNames.has(nameKey)) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´Ø¹Ø¨Û Ø§Ø³ÛŒ ÙØ§Ø±Ù… Ù…ÛŒÚº Ø¯ÙˆØ¨Ø§Ø±Û Ø¯Ø±Ø¬ ÛÛ’Û”' });
      } else if (row.name) {
        seenNames.set(nameKey, row.index);
      }

      const codeKey = row.code.toLowerCase();
      if (row.code && seenCodes.has(codeKey)) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´Ø¹Ø¨Û Ú©ÙˆÚˆ Ø§Ø³ÛŒ ÙØ§Ø±Ù… Ù…ÛŒÚº Ø¯ÙˆØ¨Ø§Ø±Û Ø¯Ø±Ø¬ ÛÛ’Û”' });
      } else if (row.code) {
        seenCodes.set(codeKey, row.index);
      }
    });

    const existingDepartments = await prisma.department.findMany({
      where: {
        tenantId: resolvedTenantId,
        branchId: branchContext.branchId,
        OR: [
          { name: { in: normalizedRows.map((row) => row.name).filter(Boolean) } },
          { code: { in: normalizedRows.map((row) => row.code).filter(Boolean) } },
        ],
      },
      select: { name: true, code: true },
    });
    const existingNames = new Set(existingDepartments.map((item) => item.name.toLowerCase()));
    const existingCodes = new Set(existingDepartments.map((item) => item.code).filter(Boolean).map((code) => code.toLowerCase()));

    normalizedRows.forEach((row) => {
      if (existingNames.has(row.name.toLowerCase())) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´Ø¹Ø¨Û Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”' });
      }
      if (row.code && existingCodes.has(row.code.toLowerCase())) {
        rowErrors.push({ index: row.index, message: 'ÛŒÛ Ø´Ø¹Ø¨Û Ú©ÙˆÚˆ Ù¾ÛÙ„Û’ Ø³Û’ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”' });
      }
    });

    if (rowErrors.length) {
      throw new AppError('Ø¯Ø±Ø¬ Ú©Ø±Ø¯Û Ø´Ø¹Ø¨Û Ø¬Ø§Øª Ù…ÛŒÚº ØºÙ„Ø·ÛŒ Ù…ÙˆØ¬ÙˆØ¯ ÛÛ’Û”', 409, { rows: rowErrors });
    }

    const departments = await prisma.$transaction(async (tx) => {
      const createdDepartments = [];

      for (const row of normalizedRows) {
        const createdDepartment = await tx.department.create({
          data: {
            name: row.name,
            tenantId: resolvedTenantId,
            branchId: branchContext.branchId,
            code: row.code || null,
            head: row.headTeacherId ? null : row.head || null,
            members: row.members,
            status: row.status,
          },
          select: departmentSelect,
        });

        await syncHeadAssignment(tx, createdDepartment.id, tenantId, row.headTeacherId, branchContext);

        const department = await tx.department.findUnique({
          where: { id: createdDepartment.id },
          select: buildDepartmentSelect(tenantId, branchContext),
        });
        createdDepartments.push(mapDepartment(department));
      }

      return createdDepartments;
    });

    return {
      items: departments,
      createdCount: departments.length,
    };
  },

  async getDepartments(tenantId, query, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, query, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      branchId: branchContext.branchId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { head: { contains: query.search } },
            ],
          }
        : {}),
      status,
    };

    const [items, totalItems] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: buildDepartmentSelect(tenantId, branchContext),
      }),
      prisma.department.count({ where }),
    ]);

    return {
      items: items.map(mapDepartment),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getDepartmentById(tenantId, id, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, {}, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const departmentId = Number(id);
    const department = await prisma.department.findFirst({
      where: { id: departmentId, tenantId: resolvedTenantId, branchId: branchContext.branchId },
      select: buildDepartmentSelect(tenantId, branchContext),
    });

    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    return mapDepartment(department);
  },

  async updateDepartment(tenantId, id, payload, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, payload, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const departmentId = Number(id);
    const existingDepartment = await prisma.department.findFirst({
      where: { id: departmentId, tenantId: resolvedTenantId, branchId: branchContext.branchId },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        id: { not: departmentId },
        tenantId: resolvedTenantId,
        branchId: branchContext.branchId,
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (duplicateDepartment) {
      throw new AppError('Another department with the same name or code already exists.', 409);
    }

    const department = await prisma.$transaction(async (tx) => {
      await tx.department.update({
        where: { id: departmentId },
        data: {
          name: payload.name,
          tenantId: resolvedTenantId,
          branchId: branchContext.branchId,
          code: payload.code || null,
          head: payload.head || null,
          members: payload.members ?? existingDepartment.members,
          status: payload.status || existingDepartment.status,
        },
        select: departmentSelect,
      });

      await syncHeadAssignment(tx, departmentId, tenantId, payload.headTeacherId, branchContext);

      return tx.department.findUnique({
        where: { id: departmentId },
        select: buildDepartmentSelect(tenantId, branchContext),
      });
    });

    return mapDepartment(department);
  },

  async deleteDepartment(tenantId, id, branchScope = null) {
    const branchContext = await resolveDepartmentBranchContext(tenantId, {}, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const departmentId = Number(id);
    const existingDepartment = await prisma.department.findFirst({
      where: { id: departmentId, tenantId: resolvedTenantId, branchId: branchContext.branchId },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    return prisma.department.delete({
      where: { id: departmentId },
      select: departmentSelect,
    });
  },
};
