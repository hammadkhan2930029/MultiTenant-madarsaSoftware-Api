import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService, classScopeService } from '../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const buildTeacherClassScopeWhere = (branchScope = null) => classScopeService.isRestricted(branchScope)
  ? {
      teachingAssignments: {
        some: {
          status: 'active',
          classId: { in: classScopeService.normalizeClassIds(branchScope) },
        },
      },
    }
  : {};

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

const buildAttendanceDateFilter = (query = {}) => {
  if (query.date) return normalizeDate(query.date);

  if (query.startDate || query.endDate) {
    return {
      ...(query.startDate ? { gte: normalizeDate(query.startDate) } : {}),
      ...(query.endDate ? { lte: normalizeDate(query.endDate) } : {}),
    };
  }

  if (query.month || query.year) {
    const year = Number(query.year || new Date().getUTCFullYear());
    const startMonth = query.month ? Number(query.month) - 1 : 0;
    const endMonth = query.month ? startMonth + 1 : 12;
    return {
      gte: new Date(Date.UTC(year, startMonth, 1)),
      lt: new Date(Date.UTC(year, endMonth, 1)),
    };
  }

  return undefined;
};

const getTeacherStartDate = (teacher) => {
  const value = teacher?.joiningDate || teacher?.appointmentDate || teacher?.createdAt;
  return value ? normalizeDate(value) : null;
};

const ensureTeacherIsAvailableOnDate = (teacher, date) => {
  const startDate = getTeacherStartDate(teacher);
  if (startDate && date < startDate) {
    throw new AppError('اس تاریخ پر استاد/عملہ ابھی شامل نہیں ہوا تھا۔', 400);
  }
};

const resolveStudentAttendanceBranchId = async (tenantId, payload, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, payload, branchScope, {
    requireActive: true,
  });
};

const resolveTeacherAttendanceBranchId = async (tenantId, payload, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, payload, branchScope, {
    requireActive: true,
  });
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

const ensureTeacherAttendanceReferences = async (tenantId, { teacherId, branchId, date }, branchScoped = false, branchScope = null) => {
  const [teacher, branch] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: teacherId, tenantId, ...(branchScoped ? { branchId } : {}), ...buildTeacherClassScopeWhere(branchScope) } }),
    prisma.branch.findFirst({ where: { id: branchId, tenantId, status: 'active' } }),
  ]);

  if (!teacher) throw new AppError('استاد نہیں ملا۔', 404);
  if (!branch) throw new AppError('برانچ نہیں ملی۔', 404);
  if (teacher.branchId && teacher.branchId !== branchId) {
    throw new AppError('Selected teacher does not belong to the selected branch.', 400);
  }
  ensureTeacherIsAvailableOnDate(teacher, date);
};

export const attendanceService = {
  async markStudentAttendance(tenantId, payload, branchScope = null) {
    classScopeService.assertClassAccess(payload.classId, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveStudentAttendanceBranchId(resolvedTenantId, payload, branchScope);
    await ensureStudentAttendanceReferences(resolvedTenantId, { ...payload, branchId }, Boolean(branchScope?.isBranchScoped));

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
    const branchId = await resolveStudentAttendanceBranchId(resolvedTenantId, query, branchScope);
    const dateFilter = buildAttendanceDateFilter(query);

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
      ...classScopeService.buildClassIdWhere(branchScope),
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
    const attendanceDate = normalizeDate(payload.date);
    await ensureTeacherAttendanceReferences(resolvedTenantId, { ...payload, branchId, date: attendanceDate }, Boolean(branchScope?.isBranchScoped), branchScope);

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
    const branchId = await resolveTeacherAttendanceBranchId(resolvedTenantId, query, branchScope);
    const dateFilter = buildAttendanceDateFilter(query);

    const where = {
      tenantId: resolvedTenantId,
      teacher: { tenantId: resolvedTenantId, ...buildTeacherClassScopeWhere(branchScope) },
      branch: { tenantId: resolvedTenantId },
      ...(dateFilter ? { date: dateFilter } : {}),
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
    const branchId = await resolveTeacherAttendanceBranchId(resolvedTenantId, query, branchScope);
    const attendanceDate = normalizeDate(query.date);
    const existingAttendance = await prisma.teacherAttendance.findFirst({
      where: {
        teacherId: query.teacherId,
        date: attendanceDate,
        tenantId: resolvedTenantId,
        teacher: { tenantId: resolvedTenantId, ...buildTeacherClassScopeWhere(branchScope) },
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
        ...(classScopeService.isRestricted(branchScope) ? { teacher: buildTeacherClassScopeWhere(branchScope) } : {}),
      },
    });

    return existingAttendance;
  },
};
