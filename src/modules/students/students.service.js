import { prisma } from '../../config/prisma.js';
import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../../utils/appError.js';
import { getNextFamilyNumber } from '../../utils/familyNumber.js';
import { assignParentRegistrationNumber } from '../../utils/parentRegistrationNumber.js';
import { normalizeStudentRegistrationNumber } from '../../utils/studentRegistration.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { branchScopeService, classScopeService } from '../security/index.js';

const buildImageUrl = (file) => (file ? `/uploads/students/${file.filename}` : null);
const buildDocumentUrl = (file) => `/uploads/student-documents/${file.filename}`;
const MAX_STUDENT_DOCUMENTS = 10;

const buildDocumentData = (files, { tenantId, branchId, studentId }) =>
  files.map((file) => ({
    tenantId,
    branchId,
    studentId,
    originalName: file.originalname,
    fileName: file.filename,
    fileUrl: buildDocumentUrl(file),
    mimeType: file.mimetype,
    fileSize: file.size,
  }));
const DEFAULT_ADMISSION_NUMBER = '0001';

const normalizeTenantId = (tenantId) => {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isInteger(normalizedTenantId) || normalizedTenantId <= 0) {
    throw new AppError('Tenant context is required for students.', 403);
  }

  return normalizedTenantId;
};

const parseAdmissionNumber = (value) => {
  const text = normalizeStudentRegistrationNumber(value);
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

const resolveStudentBranchId = (tenantId, queryOrPayload = {}, branchScope = null) =>
  branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });

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

const buildStudentClassScopeWhere = (branchScope = null) => (
  classScopeService.isRestricted(branchScope)
    ? {
        assignments: {
          some: {
            status: 'active',
            classId: { in: classScopeService.normalizeClassIds(branchScope) },
          },
        },
      }
    : {}
);

const buildStudentSelect = (branchId, branchScope = null) => ({
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
  religiousEduDate: true,
  prevSchool: true,
  secularEduDate: true,
  secularEdu: true,
  religiousEdu: true,
  requiredClass: true,
  requiredJamaat: true,
  teacherName: true,
  medicalCondition: true,
  monthlyFee: true,
  reside: true,
  imageUrl: true,
  documents: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
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
    ...((branchId || classScopeService.isRestricted(branchScope)) ? {
      where: {
        ...(branchId ? { branchId } : {}),
        ...classScopeService.buildClassIdWhere(branchScope),
      },
    } : {}),
    orderBy: { assignedAt: 'desc' },
    select: {
      id: true,
      branchId: true,
      classId: true,
      sectionId: true,
      sessionId: true,
      status: true,
      assignedAt: true,
      branch: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      session: { select: { id: true, name: true, startDate: true, endDate: true } },
    },
  },
});

const withCurrentPrimaryParentDetails = (student) => {
  if (!student) return student;
  const primaryParent = student.parents?.find((item) => ['والد', 'father'].includes(String(item.relationship || '').trim().toLowerCase()))?.parent
    || student.parents?.find((item) => item.isPrimary)?.parent
    || student.parents?.[0]?.parent;

  return {
    ...student,
    ...(primaryParent?.fullName ? { fatherName: primaryParent.fullName } : {}),
    familyNumber: primaryParent?.familyNumber || null,
  };
};

const optionalString = (value) => (value ? value : null);
const optionalDecimal = (value) => (value === undefined || value === null || value === '' ? null : value);

const ensureAssignmentReferences = async (tenantId, { branchId, classId, sectionId, sessionId }) => {
  const [branch, academicClass, section, session] = await Promise.all([
    prisma.branch.findFirst({ where: { id: branchId, tenantId, status: 'active' } }),
    prisma.academicClass.findFirst({ where: { id: classId, tenantId } }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId } }),
    prisma.academicSession.findFirst({ where: { id: sessionId, tenantId, status: 'active' } }),
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

  if (session.branchId && session.branchId !== branchId) {
    throw new AppError('Selected session does not belong to the selected branch.', 400);
  }

  return { branch, academicClass, section, session };
};

const upsertStudentParents = async (tx, tenantId, studentId, parents = [], branchId = null) => {
  await tx.studentParent.deleteMany({
    where: { studentId, tenantId },
  });

  for (const [parentIndex, parentItem] of parents.entries()) {
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

      const requestedFamilyNumber = optionalString(
        typeof parentItem.familyNumber === 'string' ? parentItem.familyNumber.trim() : parentItem.familyNumber,
      );
      if (requestedFamilyNumber && requestedFamilyNumber !== existingParent.familyNumber) {
        const duplicateFamilyNumber = await tx.parent.findFirst({
          where: { tenantId, familyNumber: requestedFamilyNumber, id: { not: parentId } },
          select: { id: true },
        });
        if (duplicateFamilyNumber) {
          throw new AppError('یہ خاندان نمبر پہلے سے موجود ہے۔', 409);
        }
      }

      await tx.parent.update({
        where: { id: parentId },
        data: {
          fullName: parentItem.fullName || existingParent.fullName,
          familyNumber: Object.prototype.hasOwnProperty.call(parentItem, 'familyNumber')
            ? requestedFamilyNumber
            : existingParent.familyNumber,
          phone: optionalString(parentItem.phone) || existingParent.phone,
          whatsapp: optionalString(parentItem.whatsapp) || existingParent.whatsapp,
          email: optionalString(parentItem.email) || existingParent.email,
          cnic: optionalString(parentItem.cnic) || existingParent.cnic,
          occupation: optionalString(parentItem.occupation) || existingParent.occupation,
          address: optionalString(parentItem.address) || existingParent.address,
          status: parentItem.status || existingParent.status,
        },
      });

      if (parentItem.fullName && parentItem.fullName !== existingParent.fullName) {
        await tx.student.updateMany({
          where: {
            tenantId,
            parents: {
              some: { tenantId, parentId, isPrimary: true },
            },
          },
          data: { fatherName: parentItem.fullName },
        });
      }
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
        const requestedFamilyNumber = optionalString(
          typeof parentItem.familyNumber === 'string' ? parentItem.familyNumber.trim() : parentItem.familyNumber,
        );
        const familyNumber = requestedFamilyNumber || (await getNextFamilyNumber(tenantId, tx));

        if (requestedFamilyNumber) {
          const duplicateFamilyNumber = await tx.parent.findFirst({
            where: { tenantId, familyNumber },
            select: { id: true },
          });
          if (duplicateFamilyNumber) {
            throw new AppError('یہ خاندان نمبر پہلے سے موجود ہے۔ موجودہ والدین کو تلاش کر کے منتخب کریں۔', 409);
          }
        }

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

        await assignParentRegistrationNumber(tx, tenantId, parent.id);

        parentId = parent.id;
      }
    }

    await tx.studentParent.create({
      data: {
        tenantId,
        studentId,
        parentId,
        relationship: parentItem.relationship,
        isPrimary: parentIndex === 0,
      },
    });
  }
};

export const studentsService = {
  async getNextAdmissionNumber(tenantId) {
    return { admissionNumber: await getNextAdmissionNumber(tenantId) };
  },

  async createStudent(tenantId, { body, file, files = [], branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, body, branchScope);
    const shouldSaveAssignment = Boolean(body.sessionId && body.classId && body.sectionId);

    if (classScopeService.isRestricted(branchScope) && !shouldSaveAssignment) {
      throw new AppError('A class-scoped user must admit the student into an assigned class.', 403);
    }

    if (shouldSaveAssignment) {
      classScopeService.assertClassAccess(body.classId, branchScope);
      await ensureAssignmentReferences(resolvedTenantId, {
        branchId: scopedBranchId,
        sessionId: body.sessionId,
        classId: body.classId,
        sectionId: body.sectionId,
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
          religiousEduDate: body.religiousEduDate || null,
          prevSchool: optionalString(body.prevSchool),
          secularEduDate: body.secularEduDate || null,
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

      if (files.length > 0) {
        await tx.studentDocument.createMany({
          data: buildDocumentData(files, {
            tenantId: resolvedTenantId,
            branchId: scopedBranchId,
            studentId: createdStudent.id,
          }),
        });
      }

      if (shouldSaveAssignment) {
        await tx.studentClassAssignment.create({
          data: {
            studentId: createdStudent.id,
            tenantId: resolvedTenantId,
            branchId: scopedBranchId,
            classId: body.classId,
            sectionId: body.sectionId,
            sessionId: body.sessionId,
          },
        });
      }

      return tx.student.findUnique({
        where: { id: createdStudent.id },
        select: buildStudentSelect(scopedBranchId, branchScope),
      });
    });

    return withCurrentPrimaryParentDetails(student);
  },

  async getStudents(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const requestedBranchId = await resolveStudentBranchId(resolvedTenantId, query, branchScope);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      AND: [
        buildStudentBranchVisibilityWhere(resolvedTenantId, requestedBranchId),
        buildStudentClassScopeWhere(branchScope),
      ].filter((item) => Object.keys(item).length),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { fatherName: { contains: query.search } },
              { parents: { some: { parent: { fullName: { contains: query.search } } } } },
              { parents: { some: { parent: { familyNumber: { contains: query.search } } } } },
              { admissionNumber: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      status,
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.classId || query.sectionId || query.sessionId
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
        select: buildStudentSelect(requestedBranchId, branchScope),
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items: items.map(withCurrentPrimaryParentDetails),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getStudentById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, {}, branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
      },
      select: buildStudentSelect(scopedBranchId, branchScope),
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    return withCurrentPrimaryParentDetails(student);
  },

  async updateStudent(tenantId, id, { body, file, files = [], branchScope = null }) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, body, branchScope);
    const shouldSaveAssignment = Boolean(body.sessionId && body.classId && body.sectionId);

    if (shouldSaveAssignment) {
      classScopeService.assertClassAccess(body.classId, branchScope);
      await ensureAssignmentReferences(resolvedTenantId, {
        branchId: scopedBranchId,
        sessionId: body.sessionId,
        classId: body.classId,
        sectionId: body.sectionId,
      });
    }
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
      },
    });

    if (!existingStudent) {
      throw new AppError('Student not found.', 404);
    }

    if (files.length > 0) {
      const existingDocumentCount = await prisma.studentDocument.count({
        where: { tenantId: resolvedTenantId, studentId: id },
      });

      if (existingDocumentCount + files.length > MAX_STUDENT_DOCUMENTS) {
        throw new AppError('A student can have a maximum of 10 admission documents.', 400);
      }
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
          religiousEduDate: body.religiousEduDate || null,
          prevSchool: optionalString(body.prevSchool),
          secularEduDate: body.secularEduDate || null,
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

      if (files.length > 0) {
        await tx.studentDocument.createMany({
          data: buildDocumentData(files, {
            tenantId: resolvedTenantId,
            branchId: scopedBranchId || existingStudent.branchId,
            studentId: id,
          }),
        });
      }

      if (shouldSaveAssignment) {
        const currentAssignment = await tx.studentClassAssignment.findFirst({
          where: { tenantId: resolvedTenantId, studentId: id, status: 'active' },
          orderBy: { assignedAt: 'desc' },
        });
        const assignmentChanged = !currentAssignment
          || currentAssignment.branchId !== scopedBranchId
          || currentAssignment.sessionId !== body.sessionId
          || currentAssignment.classId !== body.classId
          || currentAssignment.sectionId !== body.sectionId;

        if (assignmentChanged) {
          await tx.studentClassAssignment.updateMany({
            where: { tenantId: resolvedTenantId, studentId: id, status: 'active' },
            data: { status: 'inactive' },
          });
          await tx.studentClassAssignment.create({
            data: {
              studentId: id,
              tenantId: resolvedTenantId,
              branchId: scopedBranchId,
              classId: body.classId,
              sectionId: body.sectionId,
              sessionId: body.sessionId,
            },
          });
        }
      }

      return tx.student.findUnique({
        where: { id },
        select: buildStudentSelect(scopedBranchId, branchScope),
      });
    });

    return withCurrentPrimaryParentDetails(student);
  },

  async deleteStudent(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, {}, branchScope);
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
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
        select: buildStudentSelect(scopedBranchId, branchScope),
      });
    });
  },

  async deleteStudentDocument(tenantId, studentId, documentId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, {}, branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
      },
      select: { id: true },
    });

    if (!student) {
      throw new AppError('Student not found.', 404);
    }

    const document = await prisma.studentDocument.findFirst({
      where: {
        id: documentId,
        studentId,
        tenantId: resolvedTenantId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
    });

    if (!document) {
      throw new AppError('Student admission document not found.', 404);
    }

    await prisma.studentDocument.delete({ where: { id: document.id } });

    const storedFilePath = path.resolve(process.cwd(), 'uploads', 'student-documents', path.basename(document.fileName));
    try {
      await fs.unlink(storedFilePath);
    } catch (error) {
      if (error.code !== 'ENOENT' && process.env.NODE_ENV !== 'production') {
        console.error(error);
      }
    }

    return document;
  },

  async getStudentDocumentFile(tenantId, studentId, documentId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, {}, branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
      },
      select: { id: true },
    });

    if (!student) throw new AppError('Student not found.', 404);

    const document = await prisma.studentDocument.findFirst({
      where: { id: documentId, studentId, tenantId: resolvedTenantId },
      select: { id: true, originalName: true, fileName: true, mimeType: true },
    });

    if (!document) throw new AppError('Student admission document not found.', 404);

    const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'student-documents');
    const filePath = path.resolve(uploadDirectory, path.basename(document.fileName));
    if (!filePath.startsWith(`${uploadDirectory}${path.sep}`)) {
      throw new AppError('Student admission document path is invalid.', 400);
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new AppError('Uploaded document file is missing from storage.', 404);
    }

    return { ...document, filePath };
  },

  async assignClassToStudent(tenantId, studentId, payload, branchScope = null) {
    classScopeService.assertClassAccess(payload.classId, branchScope);
    const resolvedTenantId = normalizeTenantId(tenantId);
    const requestedBranchId = await resolveStudentBranchId(resolvedTenantId, payload, branchScope);
    const scopedBranchId = requestedBranchId;

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildStudentClassScopeWhere(branchScope),
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
    const scopedBranchId = await resolveStudentBranchId(resolvedTenantId, {}, branchScope);
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
    classScopeService.assertClassAccess(assignment.classId, branchScope);

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
