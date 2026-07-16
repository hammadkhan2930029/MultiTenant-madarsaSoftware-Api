import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { getNextFamilyNumber } from '../../utils/familyNumber.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService } from '../security/index.js';

const buildImageUrl = (file) => (file ? `/uploads/students/${file.filename}` : null);
const DEFAULT_ADMISSION_NUMBER = '0001';

const normalizeTenantId = (tenantId) => {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isInteger(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new AppError('Tenant context is required for students.', 403);
  }

  return normalizedTenantId;
};

const parseAdmissionNumber = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(.*?)(\d+)$/);

  if (!match) return null;

  return {
    prefix: match[1],
    number: Number(match[2]),
    width: match[2].length,
  };
};

const formatSequencedAdmissionNumber = ({ prefix, number, width }) =>
  `${prefix}${String(number).padStart(width, '0')}`;

const buildNextAdmissionNumber = (students = [], seed = DEFAULT_ADMISSION_NUMBER) => {
  const parsedSeed = parseAdmissionNumber(seed) || parseAdmissionNumber(DEFAULT_ADMISSION_NUMBER);
  const highest = students
    .map((student) => parseAdmissionNumber(student?.admissionNumber))
    .filter((item) => item && item.prefix === parsedSeed.prefix)
    .reduce((currentHighest, item) => {
      if (!currentHighest || item.number > currentHighest.number) return item;
      return currentHighest;
    }, null);

  if (!highest) return formatSequencedAdmissionNumber(parsedSeed);

  return formatSequencedAdmissionNumber({
    ...highest,
    number: highest.number + 1,
  });
};

const getNextAdmissionNumber = async (tenantId, tx = prisma) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  const profile = await tx.madrassaProfile.findUnique({
    where: { tenantId: resolvedTenantId },
    select: { regNo: true },
  });
  const students = await tx.student.findMany({
    where: { tenantId: resolvedTenantId },
    select: { admissionNumber: true },
  });

  return buildNextAdmissionNumber(students, profile?.regNo || DEFAULT_ADMISSION_NUMBER);
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const buildStudentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};

  return {
    OR: [
      { branchId },
      {
        assignments: {
          some: {
            tenantId,
            branchId,
            status: 'active',
          },
        },
      },
    ],
  };
};

const buildParentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};

  return {
    OR: [
      { branchId },
      {
        students: {
          some: {
            tenantId,
            student: buildStudentBranchVisibilityWhere(tenantId, branchId),
          },
        },
      },
    ],
  };
};

const buildStudentSelect = (branchId) => ({
  id: true,
  tenantId: true,
  branchId: true,
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
          whatsapp: true,
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
    ...(branchId ? { where: { branchId } } : {}),
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
});

const optionalString = (value) => (value ? value : null);
const optionalDecimal = (value) => (value === undefined || value === null || value === '' ? null : value);

const ensureAssignmentReferences = async (tenantId, { branchId, classId, sectionId, sessionId }) => {
  const [branch, academicClass, section, session] = await Promise.all([
    prisma.branch.findFirst({ where: { id: branchId, tenantId, status: 'active' } }),
    prisma.academicClass.findFirst({ where: { id: classId, tenantId } }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
  ]);

  if (!branch) throw new AppError('Selected branch is inactive or not available.', 403);
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

const upsertStudentParents = async (tx, tenantId, studentId, parents = [], branchId = null) => {
  await tx.studentParent.deleteMany({
    where: { studentId, tenantId },
  });

  for (const parentItem of parents) {
    let parentId = parentItem.parentId;

    if (parentId) {
      const existingParent = await tx.parent.findFirst({
        where: {
          id: parentId,
          tenantId,
          ...buildParentBranchVisibilityWhere(tenantId, branchId),
        },
      });

      if (!existingParent) {
        throw new AppError(`Parent not found for id: ${parentId}`, 404);
      }

      await tx.parent.update({
        where: { id: parentId },
        data: {
          fullName: parentItem.fullName || existingParent.fullName,
          familyNumber: optionalString(parentItem.familyNumber) || existingParent.familyNumber,
          phone: optionalString(parentItem.phone) || existingParent.phone,
          whatsapp: optionalString(parentItem.whatsapp) || existingParent.whatsapp,
          email: optionalString(parentItem.email) || existingParent.email,
          cnic: optionalString(parentItem.cnic) || existingParent.cnic,
          occupation: optionalString(parentItem.occupation) || existingParent.occupation,
          address: optionalString(parentItem.address) || existingParent.address,
          status: parentItem.status || existingParent.status,
        },
      });
    } else {
      const duplicateParent =
        parentItem.phone || parentItem.email
          ? await tx.parent.findFirst({
              where: {
                AND: [
                  { tenantId },
                  ...(branchId ? [buildParentBranchVisibilityWhere(tenantId, branchId)] : []),
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
        const familyNumber = optionalString(parentItem.familyNumber) || (await getNextFamilyNumber(tenantId, tx));

        const parent = await tx.parent.create({
          data: {
            tenantId,
            branchId,
            fullName: parentItem.fullName,
            familyNumber,
            phone: optionalString(parentItem.phone),
            whatsapp: optionalString(parentItem.whatsapp),
            email: optionalString(parentItem.email),
            cnic: optionalString(parentItem.cnic),
            occupation: optionalString(parentItem.occupation),
            address: optionalString(parentItem.address),
          },
          select: {
            id: true,
          },
        });

        parentId = parent.id;
      }
    }

    await tx.studentParent.create({
      data: {
        tenantId,
        studentId,
        parentId,
        relationship: parentItem.relationship,
        isPrimary: Boolean(parentItem.isPrimary),
      },
    });
  }
};

export const studentsService = {
  async getNextAdmissionNumber(tenantId) {
    return { admissionNumber: await getNextAdmissionNumber(tenantId) };
  },

  async createStudent(tenantId, { body, file, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    if (scopedBranchId) {
      await branchScopeService.validateBranchBelongsToTenant({
        tenantId: resolvedTenantId,
        branchId: scopedBranchId,
        requireActive: true,
      });
    }

    body.admissionNumber = optionalString(body.admissionNumber) || (await getNextAdmissionNumber(resolvedTenantId));

    const existingStudent = await prisma.student.findFirst({
      where: {
        tenantId: resolvedTenantId,
        admissionNumber: body.admissionNumber,
      },
    });

    if (existingStudent) {
      body.admissionNumber = await getNextAdmissionNumber(resolvedTenantId);
    }

    const student = await prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          tenantId: resolvedTenantId,
          branchId: scopedBranchId,
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
        await upsertStudentParents(tx, resolvedTenantId, createdStudent.id, body.parents, scopedBranchId);
      }

      return tx.student.findUnique({
        where: { id: createdStudent.id },
        select: buildStudentSelect(scopedBranchId),
      });
    });

    return student;
  },

  async getStudents(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const scopedBranchId = getScopedBranchId(branchScope);
    const requestedBranchId = scopedBranchId || query.branchId;

    if (requestedBranchId) {
      await branchScopeService.validateBranchBelongsToTenant({
        tenantId: resolvedTenantId,
        branchId: requestedBranchId,
        requireActive: true,
      });
    }

    const where = {
      tenantId: resolvedTenantId,
      AND: [
        buildStudentBranchVisibilityWhere(resolvedTenantId, requestedBranchId),
      ].filter((item) => Object.keys(item).length),
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
      ...(requestedBranchId || query.classId || query.sectionId || query.sessionId
        ? {
            assignments: {
              some: {
                tenantId: resolvedTenantId,
                status: 'active',
                ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
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
        select: buildStudentSelect(requestedBranchId),
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getStudentById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
      select: buildStudentSelect(scopedBranchId),
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    return student;
  },

  async updateStudent(tenantId, id, { body, file, branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
    });

    if (!existingStudent) {
      throw new AppError('Student not found.', 404);
    }

    const duplicateStudent = await prisma.student.findFirst({
      where: {
        id: { not: id },
        tenantId: resolvedTenantId,
        admissionNumber: body.admissionNumber || existingStudent.admissionNumber,
      },
    });

    if (duplicateStudent) {
      throw new AppError('Another student with the same admission number already exists.', 409);
    }

    const student = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id, tenantId: resolvedTenantId },
        data: {
          admissionNumber: body.admissionNumber || existingStudent.admissionNumber,
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
        await upsertStudentParents(tx, resolvedTenantId, id, body.parents, scopedBranchId || existingStudent.branchId);
      }

      return tx.student.findUnique({
        where: { id },
        select: buildStudentSelect(scopedBranchId),
      });
    });

    return student;
  },

  async deleteStudent(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
    });

    if (!existingStudent) {
      throw new AppError('Student not found.', 404);
    }

    return prisma.$transaction(async (tx) => {
      await tx.studentClassAssignment.updateMany({
        where: {
          tenantId: resolvedTenantId,
          studentId: id,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
          status: 'active',
        },
        data: {
          status: 'inactive',
        },
      });

      return tx.student.update({
        where: { id, tenantId: resolvedTenantId },
        data: { status: 'inactive' },
        select: buildStudentSelect(scopedBranchId),
      });
    });
  },

  async assignClassToStudent(tenantId, studentId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const requestedBranchId = scopedBranchId || payload.branchId;

    await branchScopeService.validateBranchBelongsToTenant({
      tenantId: resolvedTenantId,
      branchId: requestedBranchId,
      requireActive: true,
    });

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
      include: {
        assignments: {
          where: { status: 'active' },
          take: 1,
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    const activeAssignmentBranchId = student.assignments?.[0]?.branchId || null;
    const currentBranchId = student.branchId || activeAssignmentBranchId || null;

    if (currentBranchId && currentBranchId !== requestedBranchId) {
      throw new AppError('Cross-branch student transfer requires a controlled transfer workflow.', 403);
    }

    await ensureAssignmentReferences(resolvedTenantId, { ...payload, branchId: requestedBranchId });

    return prisma.$transaction(async (tx) => {
      await tx.studentClassAssignment.updateMany({
        where: {
          tenantId: resolvedTenantId,
          studentId,
          ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
          status: 'active',
        },
        data: {
          status: 'inactive',
        },
      });

      const assignment = await tx.studentClassAssignment.create({
        data: {
          studentId,
          tenantId: resolvedTenantId,
          branchId: requestedBranchId,
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

      if (!student.branchId) {
        await tx.student.update({
          where: { id: studentId, tenantId: resolvedTenantId },
          data: { branchId: requestedBranchId },
        });
      }

      return assignment;
    });
  },

  async removeClassAssignment(tenantId, assignmentId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const assignment = await prisma.studentClassAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        student: {
          select: { tenantId: true },
        },
      },
    });

    if (
      !assignment ||
      assignment.tenantId !== resolvedTenantId ||
      assignment.student?.tenantId !== resolvedTenantId ||
      (scopedBranchId && assignment.branchId !== scopedBranchId)
    ) {
      throw new AppError('Class assignment not found.', 404);
    }

    return prisma.studentClassAssignment.update({
      where: { id: assignmentId, tenantId: resolvedTenantId },
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
