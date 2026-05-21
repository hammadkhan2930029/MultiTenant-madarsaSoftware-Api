import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const buildImageUrl = (file) => (file ? `/uploads/students/${file.filename}` : null);
const generateFamilyNumber = (id) => `F-${String(id).padStart(4, '0')}`;

const studentSelect = {
  id: true,
  admissionNumber: true,
  admissionDate: true,
  admissionFee: true,
  fullName: true,
  fatherName: true,
  gender: true,
  caste: true,
  cnic: true,
  dob: true,
  bForm: true,
  phone: true,
  whatsapp: true,
  email: true,
  address: true,
  currentAddress: true,
  permanentAddress: true,
  district: true,
  prevMadrassa: true,
  prevSchool: true,
  secularEdu: true,
  religiousEdu: true,
  requiredClass: true,
  requiredJamaat: true,
  teacherName: true,
  medicalCondition: true,
  monthlyFee: true,
  reside: true,
  imageUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  parents: {
    select: {
      id: true,
      relationship: true,
      isPrimary: true,
      parent: {
        select: {
          id: true,
          fullName: true,
          familyNumber: true,
          phone: true,
          email: true,
          cnic: true,
          occupation: true,
          address: true,
          status: true,
        },
      },
    },
  },
  assignments: {
    orderBy: { assignedAt: 'desc' },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      branch: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      session: { select: { id: true, name: true, startDate: true, endDate: true } },
    },
  },
};

const optionalString = (value) => (value ? value : null);
const optionalDecimal = (value) => (value === undefined || value === null || value === '' ? null : value);

const ensureAssignmentReferences = async ({ branchId, classId, sectionId, sessionId }) => {
  const [branch, academicClass, section, session] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.academicClass.findUnique({ where: { id: classId } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
  ]);

  if (!branch) throw new AppError('Selected branch not found.', 404);
  if (!academicClass) throw new AppError('Selected class not found.', 404);
  if (!section) throw new AppError('Selected section not found.', 404);
  if (!session) throw new AppError('Selected session not found.', 404);

  if (academicClass.branchId !== branchId) {
    throw new AppError('Selected class does not belong to the selected branch.', 400);
  }

  if (section.classId !== classId) {
    throw new AppError('Selected section does not belong to the selected class.', 400);
  }

  return { branch, academicClass, section, session };
};

const upsertStudentParents = async (tx, studentId, parents = []) => {
  await tx.studentParent.deleteMany({
    where: { studentId },
  });

  for (const parentItem of parents) {
    let parentId = parentItem.parentId;

    if (parentId) {
      const existingParent = await tx.parent.findUnique({
        where: { id: parentId },
      });

      if (!existingParent) {
        throw new AppError(`Parent not found for id: ${parentId}`, 404);
      }

      await tx.parent.update({
        where: { id: parentId },
        data: {
          fullName: parentItem.fullName || existingParent.fullName,
          familyNumber: optionalString(parentItem.familyNumber) || existingParent.familyNumber,
          phone: optionalString(parentItem.phone),
          email: optionalString(parentItem.email),
          cnic: optionalString(parentItem.cnic),
          occupation: optionalString(parentItem.occupation),
          address: optionalString(parentItem.address),
          status: parentItem.status || existingParent.status,
        },
      });
    } else {
      const duplicateParent =
        parentItem.phone || parentItem.email
          ? await tx.parent.findFirst({
              where: {
                AND: [
                  { fullName: parentItem.fullName },
                  {
                    OR: [
                      ...(parentItem.phone ? [{ phone: parentItem.phone }] : []),
                      ...(parentItem.email ? [{ email: parentItem.email }] : []),
                    ],
                  },
                ],
              },
            })
          : null;

      if (duplicateParent) {
        parentId = duplicateParent.id;
      } else {
        const parent = await tx.parent.create({
          data: {
            fullName: parentItem.fullName,
            familyNumber: optionalString(parentItem.familyNumber),
            phone: optionalString(parentItem.phone),
            email: optionalString(parentItem.email),
            cnic: optionalString(parentItem.cnic),
            occupation: optionalString(parentItem.occupation),
            address: optionalString(parentItem.address),
          },
          select: {
            id: true,
            familyNumber: true,
          },
        });

        if (!parent.familyNumber) {
          await tx.parent.update({
            where: { id: parent.id },
            data: {
              familyNumber: generateFamilyNumber(parent.id),
            },
          });
        }

        parentId = parent.id;
      }
    }

    await tx.studentParent.create({
      data: {
        studentId,
        parentId,
        relationship: parentItem.relationship,
        isPrimary: Boolean(parentItem.isPrimary),
      },
    });
  }
};

export const studentsService = {
  async createStudent({ body, file }) {
    const existingStudent = await prisma.student.findUnique({
      where: { admissionNumber: body.admissionNumber },
    });

    if (existingStudent) {
      throw new AppError('Student with the same admission number already exists.', 409);
    }

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          admissionNumber: body.admissionNumber,
          admissionDate: body.admissionDate || null,
          admissionFee: optionalDecimal(body.admissionFee),
          fullName: body.fullName,
          fatherName: body.fatherName,
          gender: body.gender,
          caste: optionalString(body.caste),
          cnic: optionalString(body.cnic),
          dob: body.dob || null,
          bForm: optionalString(body.bForm),
          phone: optionalString(body.phone),
          whatsapp: optionalString(body.whatsapp),
          email: optionalString(body.email),
          address: optionalString(body.address || body.currentAddress),
          currentAddress: optionalString(body.currentAddress || body.address),
          permanentAddress: optionalString(body.permanentAddress),
          district: optionalString(body.district),
          prevMadrassa: optionalString(body.prevMadrassa),
          prevSchool: optionalString(body.prevSchool),
          secularEdu: optionalString(body.secularEdu),
          religiousEdu: optionalString(body.religiousEdu),
          requiredClass: optionalString(body.requiredClass),
          requiredJamaat: optionalString(body.requiredJamaat),
          teacherName: optionalString(body.teacherName),
          medicalCondition: optionalString(body.medicalCondition),
          monthlyFee: optionalDecimal(body.monthlyFee),
          reside: optionalString(body.reside),
          imageUrl: buildImageUrl(file),
        },
      });

      if (Array.isArray(body.parents) && body.parents.length > 0) {
        await upsertStudentParents(tx, createdStudent.id, body.parents);
      }

      return tx.student.findUnique({
        where: { id: createdStudent.id },
        select: studentSelect,
      });
    });

    return student;
  },

  async getStudents(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { fatherName: { contains: query.search } },
              { admissionNumber: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.branchId || query.classId || query.sectionId || query.sessionId
        ? {
            assignments: {
              some: {
                status: 'active',
                ...(query.branchId ? { branchId: query.branchId } : {}),
                ...(query.classId ? { classId: query.classId } : {}),
                ...(query.sectionId ? { sectionId: query.sectionId } : {}),
                ...(query.sessionId ? { sessionId: query.sessionId } : {}),
              },
            },
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: studentSelect,
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getStudentById(id) {
    const student = await prisma.student.findUnique({
      where: { id },
      select: studentSelect,
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    return student;
  },

  async updateStudent(id, { body, file }) {
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    });

    if (!existingStudent) {
      throw new AppError('Student not found.', 404);
    }

    const duplicateStudent = await prisma.student.findFirst({
      where: {
        id: { not: id },
        admissionNumber: body.admissionNumber,
      },
    });

    if (duplicateStudent) {
      throw new AppError('Another student with the same admission number already exists.', 409);
    }

    const student = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: {
          admissionNumber: body.admissionNumber,
          admissionDate: body.admissionDate || null,
          admissionFee: optionalDecimal(body.admissionFee),
          fullName: body.fullName,
          fatherName: body.fatherName,
          gender: body.gender,
          caste: optionalString(body.caste),
          cnic: optionalString(body.cnic),
          dob: body.dob || null,
          bForm: optionalString(body.bForm),
          phone: optionalString(body.phone),
          whatsapp: optionalString(body.whatsapp),
          email: optionalString(body.email),
          address: optionalString(body.address || body.currentAddress),
          currentAddress: optionalString(body.currentAddress || body.address),
          permanentAddress: optionalString(body.permanentAddress),
          district: optionalString(body.district),
          prevMadrassa: optionalString(body.prevMadrassa),
          prevSchool: optionalString(body.prevSchool),
          secularEdu: optionalString(body.secularEdu),
          religiousEdu: optionalString(body.religiousEdu),
          requiredClass: optionalString(body.requiredClass),
          requiredJamaat: optionalString(body.requiredJamaat),
          teacherName: optionalString(body.teacherName),
          medicalCondition: optionalString(body.medicalCondition),
          monthlyFee: optionalDecimal(body.monthlyFee),
          reside: optionalString(body.reside),
          imageUrl: file ? buildImageUrl(file) : existingStudent.imageUrl,
          status: body.status || existingStudent.status,
        },
      });

      if (Array.isArray(body.parents)) {
        await upsertStudentParents(tx, id, body.parents);
      }

      return tx.student.findUnique({
        where: { id },
        select: studentSelect,
      });
    });

    return student;
  },

  async assignClassToStudent(studentId, payload) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    await ensureAssignmentReferences(payload);

    return prisma.$transaction(async (tx) => {
      await tx.studentClassAssignment.updateMany({
        where: {
          studentId,
          status: 'active',
        },
        data: {
          status: 'inactive',
        },
      });

      const assignment = await tx.studentClassAssignment.create({
        data: {
          studentId,
          branchId: payload.branchId,
          classId: payload.classId,
          sectionId: payload.sectionId,
          sessionId: payload.sessionId,
        },
        select: {
          id: true,
          status: true,
          assignedAt: true,
          branch: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          session: { select: { id: true, name: true, startDate: true, endDate: true } },
        },
      });

      return assignment;
    });
  },

  async removeClassAssignment(assignmentId) {
    const assignment = await prisma.studentClassAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new AppError('Class assignment not found.', 404);
    }

    return prisma.studentClassAssignment.update({
      where: { id: assignmentId },
      data: { status: 'inactive' },
      select: {
        id: true,
        status: true,
        assignedAt: true,
        branch: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        session: { select: { id: true, name: true, startDate: true, endDate: true } },
      },
    });
  },
};
