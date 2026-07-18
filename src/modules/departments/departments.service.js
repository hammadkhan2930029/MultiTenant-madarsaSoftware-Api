import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const departmentSelect = {
  id: true,
  name: true,
  code: true,
  head: true,
  members: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const getBranchScopeKey = (branchScope) => {
  const branchId = getScopedBranchId(branchScope);
  return branchId ? `branch:${branchId}` : 'tenant';
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

const validateHeadTeacher = async (tenantId, headTeacherId, branchScope = null) => {
  if (!headTeacherId) return null;

  const resolvedTenantId = normalizeTenantId(tenantId);

  if (!resolvedTenantId) {
    throw new AppError('Tenant context is required to assign department head.', 403);
  }

  const branchId = getScopedBranchId(branchScope);
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

const syncHeadAssignment = async (tx, departmentId, tenantId, headTeacherId, branchScope = null) => {
  if (headTeacherId === undefined) return null;

  const resolvedTenantId = normalizeTenantId(tenantId);

  if (!resolvedTenantId) {
    if (headTeacherId === null || headTeacherId === '') return null;
    throw new AppError('Tenant context is required to assign department head.', 403);
  }

  const branchId = getScopedBranchId(branchScope);
  const branchScopeKey = getBranchScopeKey(branchScope);
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

  const teacher = await validateHeadTeacher(resolvedTenantId, headTeacherId, branchScope);
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
    const existingDepartment = await prisma.department.findFirst({
      where: {
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
          code: payload.code || null,
          head: payload.head || null,
          members: payload.members ?? 0,
          status: payload.status || 'active',
        },
        select: departmentSelect,
      });

      await syncHeadAssignment(tx, createdDepartment.id, tenantId, payload.headTeacherId, branchScope);

      return tx.department.findUnique({
        where: { id: createdDepartment.id },
        select: buildDepartmentSelect(tenantId, branchScope),
      });
    });

    return mapDepartment(department);
  },

  async bulkCreateDepartments(tenantId, payload, branchScope = null) {
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
      throw new AppError('کم از کم ایک شعبہ کی معلومات درج کریں۔', 400);
    }

    const rowErrors = [];
    const seenNames = new Map();
    const seenCodes = new Map();

    normalizedRows.forEach((row) => {
      if (!row.name) {
        rowErrors.push({ index: row.index, message: 'شعبہ کا نام ضروری ہے۔' });
      }

      const nameKey = row.name.toLowerCase();
      if (row.name && seenNames.has(nameKey)) {
        rowErrors.push({ index: row.index, message: 'یہ شعبہ اسی فارم میں دوبارہ درج ہے۔' });
      } else if (row.name) {
        seenNames.set(nameKey, row.index);
      }

      const codeKey = row.code.toLowerCase();
      if (row.code && seenCodes.has(codeKey)) {
        rowErrors.push({ index: row.index, message: 'یہ شعبہ کوڈ اسی فارم میں دوبارہ درج ہے۔' });
      } else if (row.code) {
        seenCodes.set(codeKey, row.index);
      }
    });

    const existingDepartments = await prisma.department.findMany({
      where: {
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
        rowErrors.push({ index: row.index, message: 'یہ شعبہ پہلے سے موجود ہے۔' });
      }
      if (row.code && existingCodes.has(row.code.toLowerCase())) {
        rowErrors.push({ index: row.index, message: 'یہ شعبہ کوڈ پہلے سے موجود ہے۔' });
      }
    });

    if (rowErrors.length) {
      throw new AppError('درج کردہ شعبہ جات میں غلطی موجود ہے۔', 409, { rows: rowErrors });
    }

    const departments = await prisma.$transaction(async (tx) => {
      const createdDepartments = [];

      for (const row of normalizedRows) {
        const createdDepartment = await tx.department.create({
          data: {
            name: row.name,
            code: row.code || null,
            head: row.headTeacherId ? null : row.head || null,
            members: row.members,
            status: row.status,
          },
          select: departmentSelect,
        });

        await syncHeadAssignment(tx, createdDepartment.id, tenantId, row.headTeacherId, branchScope);

        const department = await tx.department.findUnique({
          where: { id: createdDepartment.id },
          select: buildDepartmentSelect(tenantId, branchScope),
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
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { head: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: buildDepartmentSelect(tenantId, branchScope),
      }),
      prisma.department.count({ where }),
    ]);

    return {
      items: items.map(mapDepartment),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getDepartmentById(tenantId, id, branchScope = null) {
    const departmentId = Number(id);
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: buildDepartmentSelect(tenantId, branchScope),
    });

    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    return mapDepartment(department);
  },

  async updateDepartment(tenantId, id, payload, branchScope = null) {
    const departmentId = Number(id);
    const existingDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        id: { not: departmentId },
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
          code: payload.code || null,
          head: payload.head || null,
          members: payload.members ?? existingDepartment.members,
          status: payload.status || existingDepartment.status,
        },
        select: departmentSelect,
      });

      await syncHeadAssignment(tx, departmentId, tenantId, payload.headTeacherId, branchScope);

      return tx.department.findUnique({
        where: { id: departmentId },
        select: buildDepartmentSelect(tenantId, branchScope),
      });
    });

    return mapDepartment(department);
  },

  async deleteDepartment(id) {
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    return prisma.department.delete({
      where: { id },
      select: departmentSelect,
    });
  },
};
