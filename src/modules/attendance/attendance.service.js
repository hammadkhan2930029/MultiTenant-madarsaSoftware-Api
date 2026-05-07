import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const studentAttendanceSelect = {
  id: true,
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
  date: true,
  status: true,
  remarks: true,
  createdAt: true,
  updatedAt: true,
  teacher: {
    select: {
      id: true,
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
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const ensureStudentAttendanceReferences = async ({ studentId, branchId, classId, sectionId }) => {
  const [student, branch, academicClass, section, activeAssignment] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.academicClass.findUnique({ where: { id: classId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.studentClassAssignment.findFirst({
      where: {
        studentId,
        branchId,
        classId,
        sectionId,
        status: 'active',
      },
    }),
  ]);

  if (!student) throw new AppError('Student not found.', 404);
  if (!branch) throw new AppError('Branch not found.', 404);
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

const ensureTeacherAttendanceReferences = async ({ teacherId, branchId }) => {
  const [teacher, branch] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: teacherId } }),
    prisma.branch.findUnique({ where: { id: branchId } }),
  ]);

  if (!teacher) throw new AppError('Teacher not found.', 404);
  if (!branch) throw new AppError('Branch not found.', 404);
};

export const attendanceService = {
  async markStudentAttendance(payload) {
    await ensureStudentAttendanceReferences(payload);

    const attendanceDate = normalizeDate(payload.date);

    return prisma.studentAttendance.upsert({
      where: {
        studentId_date: {
          studentId: payload.studentId,
          date: attendanceDate,
        },
      },
      create: {
        studentId: payload.studentId,
        branchId: payload.branchId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        date: attendanceDate,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      update: {
        branchId: payload.branchId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      select: studentAttendanceSelect,
    });
  },

  async getStudentAttendance(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.date ? { date: normalizeDate(query.date) } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
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

  async markTeacherAttendance(payload) {
    await ensureTeacherAttendanceReferences(payload);

    const attendanceDate = normalizeDate(payload.date);

    return prisma.teacherAttendance.upsert({
      where: {
        teacherId_date: {
          teacherId: payload.teacherId,
          date: attendanceDate,
        },
      },
      create: {
        teacherId: payload.teacherId,
        branchId: payload.branchId,
        date: attendanceDate,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      update: {
        branchId: payload.branchId,
        status: payload.status,
        remarks: payload.remarks || null,
      },
      select: teacherAttendanceSelect,
    });
  },

  async getTeacherAttendance(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.date ? { date: normalizeDate(query.date) } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
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
};
