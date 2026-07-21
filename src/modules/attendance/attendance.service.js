import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { ensureDefaultBranch } from '../branches/branches.service.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const studentAttendanceSelect = {
  id: true,
  tenantId: true,
  studentId: true,
  branchId: true,
  classId: true,
  sectionId: true,
  date: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      admissionNumber: true,
      fullName: true,
      fatherName: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  class: {
    select: {
      id: true,
      name: true,
    },
  },
  section: {
    select: {
      id: true,
      name: true,
    },
  },
};

const teacherAttendanceSelect = {
  id: true,
  tenantId: true,
  teacherId: true,
  branchId: true,
  date: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  teacher: {
    select: {
      id: true,
      tenantId: true,
      fullName: true,
      phone: true,
      subject: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
};

const normalizeDate = (value) => {
  if (typeof value === 'string') {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (year && month && day) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const getRequestedBranchId = (payloadOrQuery = {}, branchScope = null) =>
  getScopedBranchId(branchScope) || payloadOrQuery.branchId || null;

const getDefaultActiveBranchId = async (tenantId) => {
  const branch =
    await prisma.branch.findFirst({
      where: {
        tenantId,
        status: 'active',
        OR: [{ name: 'Main Campus' }, { code: 'MC-01' }],
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    }) ||
    await prisma.branch.findFirst({
      where: {
        tenantId,
        status: 'active',
      },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

  if (!branch) {
    const defaultBranch = await ensureDefaultBranch(tenantId);
    return defaultBranch.id;
  }

  return branch.id;
};

const resolveStudentAttendanceBranchId = async (tenantId, payload, branchScope = null) => {
  const requestedBranchId = getRequestedBranchId(payload, branchScope);
  if (requestedBranchId) return requestedBranchId;

  if (payload.classId) {
    const academicClass = await prisma.academicClass.findFirst({
      where: { id: payload.classId, tenantId },
      select: { branchId: true },
    });
    if (academicClass?.branchId) return academicClass.branchId;
  }

  return getDefaultActiveBranchId(tenantId);
};

const resolveTeacherAttendanceBranchId = async (tenantId, payload, branchScope = null) => {
  const requestedBranchId = getRequestedBranchId(payload, branchScope);
  if (requestedBranchId) return requestedBranchId;

  if (payload.teacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: payload.teacherId, tenantId },
      select: { branchId: true },
    });
    if (teacher?.branchId) return teacher.branchId;
  }

  return getDefaultActiveBranchId(tenantId);
};

const ensureStudentAttendanceReferences = async (tenantId, { studentId, branchId, classId, sectionId }, branchScoped = false) => {
  const [student, branch, academicClass, section, activeAssignment] = await Promise.all([
    prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId,
        ...(branchScoped
          ? { OR: [{ branchId }, { assignments: { some: { tenantId, branchId, status: 'active' } } }] }
          : {}),
      },
    }),
    prisma.branch.findFirst({ where: { id: branchId, tenantId, status: 'active' } }),
    prisma.academicClass.findFirst({ where: { id: classId, tenantId, branchId } }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId } }),
    prisma.studentClassAssignment.findFirst({
      where: {
        tenantId,
        studentId,
        branchId,
        classId,
        sectionId,
        status: 'active',
      },
    }),
  ]);

  if (!student) throw new AppError('Student not found.', 404);
  if (!branch) throw new AppError('برانچ نہیں ملی۔', 404);
  if (!academicClass) throw new AppError('Class not found.', 404);
  if (!section) throw new AppError('Section not found.', 404);

  if (academicClass.branchId !== branchId) {
    throw new AppError('Selected class does not belong to the selected branch.', 400);
  }

  if (section.classId !== classId) {
    throw new AppError('Selected section does not belong to the selected class.', 400);
  }

  if (!activeAssignment) {
    throw new AppError('Student is not actively assigned to the selected branch/class/section.', 400);
  }
};

const ensureTeacherAttendanceReferences = async (tenantId, { teacherId, branchId }, branchScoped = false) => {
  const [teacher, branch] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, tenantId, ...(branchScoped ? { branchId } : {}) } }),
    prisma.branch.findFirst({ where: { id: branchId, tenantId, status: 'active' } }),
  ]);

  if (!teacher) throw new AppError('استاد نہیں ملا۔', 404);
  if (!branch) throw new AppError('برانچ نہیں ملی۔', 404);
  if (teacher.branchId && teacher.branchId !== branchId) {
    throw new AppError('Selected teacher does not belong to the selected branch.', 400);
  }
};

export const attendanceService = {
  async markStudentAttendance(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveStudentAttendanceBranchId(resolvedTenantId, payload, branchScope);
    await ensureStudentAttendanceReferences(resolvedTenantId, { ...payload, branchId }, Boolean(getScopedBranchId(branchScope)));

    const attendanceDate = normalizeDate(payload.date);

    return prisma.studentAttendance.upsert({
      where: {
        studentId_date: {
          studentId: payload.studentId,
          date: attendanceDate,
        },
      },
      create: {
        tenantId: resolvedTenantId,
        studentId: payload.studentId,
        branchId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        date: attendanceDate,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      update: {
        tenantId: resolvedTenantId,
        branchId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      select: studentAttendanceSelect,
    });
  },

  async getStudentAttendance(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getRequestedBranchId(query, branchScope);
    const dateFilter = query.date
      ? normalizeDate(query.date)
      : query.startDate || query.endDate
        ? {
            ...(query.startDate ? { gte: normalizeDate(query.startDate) } : {}),
            ...(query.endDate ? { lte: normalizeDate(query.endDate) } : {}),
          }
        : undefined;

    const where = {
      tenantId: resolvedTenantId,
      student: { tenantId: resolvedTenantId },
      branch: { tenantId: resolvedTenantId },
      class: { tenantId: resolvedTenantId },
      section: { tenantId: resolvedTenantId },
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.studentAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: studentAttendanceSelect,
      }),
      prisma.studentAttendance.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async markTeacherAttendance(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveTeacherAttendanceBranchId(resolvedTenantId, payload, branchScope);
    await ensureTeacherAttendanceReferences(resolvedTenantId, { ...payload, branchId }, Boolean(getScopedBranchId(branchScope)));

    const attendanceDate = normalizeDate(payload.date);

    return prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId: payload.teacherId,
          date: attendanceDate,
        },
      },
      create: {
        tenantId: resolvedTenantId,
        teacherId: payload.teacherId,
        branchId,
        date: attendanceDate,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      update: {
        tenantId: resolvedTenantId,
        branchId,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      select: teacherAttendanceSelect,
    });
  },

  async getTeacherAttendance(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getRequestedBranchId(query, branchScope);

    const where = {
      tenantId: resolvedTenantId,
      teacher: { tenantId: resolvedTenantId },
      branch: { tenantId: resolvedTenantId },
      ...(query.date ? { date: normalizeDate(query.date) } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacherAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: teacherAttendanceSelect,
      }),
      prisma.teacherAttendance.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async deleteTeacherAttendance(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const attendanceDate = normalizeDate(query.date);
    const existingAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: query.teacherId,
        date: attendanceDate,
        tenantId: resolvedTenantId,
        teacher: { tenantId: resolvedTenantId },
        ...(branchId ? { branchId } : {}),
      },
      select: teacherAttendanceSelect,
    });

    if (!existingAttendance) {
      return null;
    }

    await prisma.teacherAttendance.deleteMany({
      where: {
        teacherId: query.teacherId,
        date: attendanceDate,
        tenantId: resolvedTenantId,
        ...(branchId ? { branchId } : {}),
      },
    });

    return existingAttendance;
  },
};
