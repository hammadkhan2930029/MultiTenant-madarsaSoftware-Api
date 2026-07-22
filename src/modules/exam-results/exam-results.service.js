import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService } from '../security/index.js';

const DEFAULT_EXAM_NAME = '\u0627\u0645\u062a\u062d\u0627\u0646\u06cc \u0631\u0632\u0644\u0679';
const LEGACY_DEFAULT_EXAM_NAME = '\u00d8\u00a7\u00d9\u2026\u00d8\u00aa\u00d8\u00ad\u00d8\u00a7\u00d9\u2020\u00db\u2019 \u00d8\u00b1\u00d8\u00b2\u00d9\u201e\u00d9\u00b9';
const UNKNOWN_DEFAULT_EXAM_NAME = '??????? ????';

const examResultSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  examName: true,
  totalMarks: true,
  obtainedMarks: true,
  percentage: true,
  gradeTitle: true,
  gradeCode: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: { select: { id: true, tenantId: true, fullName: true, fatherName: true, admissionNumber: true } },
  session: { select: { id: true, name: true } },
  class: { select: { id: true, tenantId: true, name: true } },
  section: { select: { id: true, tenantId: true, name: true } },
  subjects: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      tenantId: true,
      totalMarks: true,
      obtainedMarks: true,
      percentage: true,
      gradeTitle: true,
      gradeCode: true,
      status: true,
      subject: { select: { id: true, tenantId: true, name: true } },
    },
  },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const toNumber = (value) => Number(value || 0);
const percentageOf = (obtainedMarks, totalMarks) => Number(((toNumber(obtainedMarks) / toNumber(totalMarks)) * 100).toFixed(2));

const formatGradeLabel = (grade) => (grade?.code ? `${grade.title} (${grade.code})` : grade?.title || null);

const findGrade = (percentage, grades) =>
  grades.find((grade) => percentage >= grade.fromPercent && percentage <= grade.toPercent) || null;

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const buildStudentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};
  return { OR: [{ branchId }, { assignments: { some: { tenantId, branchId, status: 'active' } } }] };
};

const resolveRequestedBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || payloadOrQuery.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

const formatExamResult = (result) => ({
  ...result,
  percentage: Number(result.percentage),
  grade: result.gradeTitle ? (result.gradeCode ? `${result.gradeTitle} (${result.gradeCode})` : result.gradeTitle) : '---',
  subjects: (result.subjects || []).map((subjectRow) => ({
    id: subjectRow.id,
    subjectId: subjectRow.subject.id,
    subjectName: subjectRow.subject.name,
    totalMarks: subjectRow.totalMarks,
    obtainedMarks: subjectRow.obtainedMarks,
    percentage: Number(subjectRow.percentage),
    gradeTitle: subjectRow.gradeTitle,
    gradeCode: subjectRow.gradeCode,
    grade: subjectRow.gradeTitle ? (subjectRow.gradeCode ? `${subjectRow.gradeTitle} (${subjectRow.gradeCode})` : subjectRow.gradeTitle) : '---',
    status: subjectRow.status,
  })),
});

const ensureReferences = async (tenantId, { studentId, sessionId, classId, sectionId, examName, subjects }, requestedBranchId = null) => {
  const subjectIds = [...new Set(subjects.map((subject) => subject.subjectId))];
  if (subjectIds.length !== subjects.length) {
    throw new AppError('Duplicate subjects are not allowed in the same result.', 400);
  }

  const [student, session, academicClass, section, dbSubjects] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, tenantId, ...buildStudentBranchVisibilityWhere(tenantId, requestedBranchId) } }),
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findFirst({ where: { id: classId, tenantId, ...(requestedBranchId ? { branchId: requestedBranchId } : {}) } }),
    sectionId ? prisma.section.findFirst({ where: { id: sectionId, tenantId } }) : Promise.resolve(null),
    prisma.subject.findMany({ where: { id: { in: subjectIds }, tenantId, status: 'active' }, select: { id: true } }),
  ]);

  if (!student || student.status !== 'active') throw new AppError('Active student not found.', 404);
  if (!session || session.status !== 'active') throw new AppError('Active session not found.', 404);
  if (!academicClass || academicClass.status !== 'active') throw new AppError('Active class not found.', 404);
  if (sectionId && (!section || section.status !== 'active')) throw new AppError('Active section not found.', 404);
  if (sectionId && section.classId !== classId) throw new AppError('Selected section does not belong to selected class.', 400);
  if (requestedBranchId && academicClass.branchId !== requestedBranchId) {
    throw new AppError('Selected class does not belong to the selected branch.', 400);
  }
  if (dbSubjects.length !== subjectIds.length) throw new AppError('One or more active subjects were not found.', 404);

  const scheduleWhere = {
    tenantId,
    examName,
    sessionId,
    classId,
    sectionId: sectionId || null,
    status: 'active',
    ...(requestedBranchId ? { class: { tenantId, branchId: requestedBranchId } } : { class: { tenantId } }),
  };
  const scheduleSubjects = await prisma.examSchedule.findMany({
    where: scheduleWhere,
    select: {
      subjectId: true,
      totalMarks: true,
      subject: { select: { id: true, name: true } },
    },
  });

  if (!scheduleSubjects.length) {
    throw new AppError('منتخب امتحانی نظام الاوقات نہیں ملا۔', 404);
  }

  const scheduleBySubjectId = new Map(scheduleSubjects.map((schedule) => [Number(schedule.subjectId), schedule]));
  if (scheduleSubjects.length !== subjectIds.length || subjectIds.some((subjectId) => !scheduleBySubjectId.has(Number(subjectId)))) {
    throw new AppError('رزلٹ میں صرف منتخب امتحانی نظام الاوقات کے مضامین شامل کیے جا سکتے ہیں۔', 400);
  }

  const scheduledSubjects = subjects.map((subject) => {
    const schedule = scheduleBySubjectId.get(Number(subject.subjectId));
    return {
      ...subject,
      totalMarks: Number(schedule.totalMarks),
    };
  });

  const assignment = await prisma.studentClassAssignment.findFirst({
    where: {
      tenantId,
      studentId,
      sessionId,
      classId,
      ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
      ...(sectionId ? { sectionId } : {}),
      status: 'active',
    },
  });

  if (!assignment) {
    throw new AppError('Student is not assigned to this class/session.', 400);
  }

  const resolvedBranchId = requestedBranchId || assignment.branchId || academicClass.branchId || student.branchId || null;
  if (resolvedBranchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId: resolvedBranchId, requireActive: true });
  }
  return { branchId: resolvedBranchId, subjects: scheduledSubjects };
};

const buildCalculatedResult = async (tenantId, payload) => {
  const grades = await prisma.resultGrade.findMany({
    where: { tenantId, status: 'active' },
    orderBy: { fromPercent: 'desc' },
  });

  const subjectRows = payload.subjects.map((subject) => {
    const percentage = percentageOf(subject.obtainedMarks, subject.totalMarks);
    const grade = findGrade(percentage, grades);
    return {
      subjectId: subject.subjectId,
      totalMarks: subject.totalMarks,
      obtainedMarks: subject.obtainedMarks,
      percentage,
      gradeTitle: grade?.title || null,
      gradeCode: grade?.code || null,
      grade: formatGradeLabel(grade),
    };
  });

  const totalMarks = subjectRows.reduce((sum, subject) => sum + subject.totalMarks, 0);
  const obtainedMarks = subjectRows.reduce((sum, subject) => sum + subject.obtainedMarks, 0);
  const percentage = percentageOf(obtainedMarks, totalMarks);
  const grade = findGrade(percentage, grades);

  return {
    examName: payload.examName || DEFAULT_EXAM_NAME,
    totalMarks,
    obtainedMarks,
    percentage,
    gradeTitle: grade?.title || null,
    gradeCode: grade?.code || null,
    remarks: payload.remarks || null,
    status: payload.status || 'active',
    subjects: subjectRows,
  };
};

const writeResult = async (tx, tenantId, existingResultId, payload, calculated, branchId = null) => {
  const data = {
    tenantId,
    branchId,
    studentId: payload.studentId,
    sessionId: payload.sessionId,
    classId: payload.classId,
    sectionId: payload.sectionId || null,
    examName: calculated.examName,
    totalMarks: calculated.totalMarks,
    obtainedMarks: calculated.obtainedMarks,
    percentage: calculated.percentage,
    gradeTitle: calculated.gradeTitle,
    gradeCode: calculated.gradeCode,
    remarks: calculated.remarks,
    status: calculated.status,
  };

  const result = existingResultId
    ? await tx.examResult.update({ where: { id: existingResultId, tenantId }, data, select: { id: true } })
    : await tx.examResult.create({ data, select: { id: true } });

  await tx.examResultSubject.deleteMany({ where: { examResultId: result.id, tenantId } });
  await tx.examResultSubject.createMany({
    data: calculated.subjects.map((subject) => ({
      tenantId,
      examResultId: result.id,
      subjectId: subject.subjectId,
      totalMarks: subject.totalMarks,
      obtainedMarks: subject.obtainedMarks,
      percentage: subject.percentage,
      gradeTitle: subject.gradeTitle,
      gradeCode: subject.gradeCode,
      status: 'active',
    })),
  });

  return tx.examResult.findFirst({ where: { id: result.id, tenantId }, select: examResultSelect });
};

export const examResultsService = {
  async saveExamResult(tenantId, payload, id = null, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const requestedBranchId = await resolveRequestedBranchId(resolvedTenantId, payload, branchScope);
    const { branchId, subjects } = await ensureReferences(resolvedTenantId, payload, requestedBranchId);
    const scopedPayload = { ...payload, subjects };
    const scopedBranchId = getScopedBranchId(branchScope);
    const calculated = await buildCalculatedResult(resolvedTenantId, scopedPayload);

    const existingResult = id
      ? await prisma.examResult.findFirst({ where: { id: Number(id), tenantId: resolvedTenantId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) } })
      : await prisma.examResult.findFirst({
          where: {
            tenantId: resolvedTenantId,
            ...(branchId ? { branchId } : {}),
            studentId: payload.studentId,
            sessionId: payload.sessionId,
            classId: payload.classId,
            sectionId: payload.sectionId || null,
            examName: calculated.examName,
          },
        });

    if (id && !existingResult) {
      throw new AppError('Exam result not found.', 404);
    }

    const result = await prisma.$transaction((tx) => writeResult(tx, resolvedTenantId, existingResult?.id || null, scopedPayload, calculated, branchId));
    return formatExamResult(result);
  },

  async getExamResults(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveRequestedBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) },
      class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId, section: { tenantId: resolvedTenantId } } : {}),
      ...(query.examName ? { examName: query.examName } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { examName: { contains: query.search } },
              { student: { fullName: { contains: query.search } } },
              { student: { fatherName: { contains: query.search } } },
              { student: { admissionNumber: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.examResult.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: examResultSelect,
      }),
      prisma.examResult.count({ where }),
    ]);

    return {
      items: items.map(formatExamResult),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getExamResultById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const result = await prisma.examResult.findFirst({
      where: {
        id: Number(id),
        tenantId: resolvedTenantId,
        ...(branchId ? { branchId } : {}),
        student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) },
        class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      },
      select: examResultSelect,
    });
    if (!result) throw new AppError('Exam result not found.', 404);
    return formatExamResult(result);
  },

  async findStudentExamResult(tenantId, studentId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveRequestedBranchId(resolvedTenantId, query, branchScope);
    const student = await prisma.student.findFirst({ where: { id: Number(studentId), tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) }, select: { id: true } });
    if (!student) throw new AppError('Student not found.', 404);

    const result = await prisma.examResult.findFirst({
      where: {
        tenantId: resolvedTenantId,
        ...(branchId ? { branchId } : {}),
        studentId: Number(studentId),
        student: { tenantId: resolvedTenantId, ...buildStudentBranchVisibilityWhere(resolvedTenantId, branchId) },
        ...(query.sessionId ? { sessionId: query.sessionId } : {}),
        ...(query.classId ? { classId: query.classId, class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } } : {}),
        ...(query.sectionId ? { sectionId: query.sectionId, section: { tenantId: resolvedTenantId } } : {}),
        ...(query.examName
          ? { examName: query.examName }
          : { examName: { in: [DEFAULT_EXAM_NAME, LEGACY_DEFAULT_EXAM_NAME, UNKNOWN_DEFAULT_EXAM_NAME] } }),
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
      select: examResultSelect,
    });

    return result ? formatExamResult(result) : null;
  },

  async deleteExamResult(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const existingResult = await prisma.examResult.findFirst({ where: { id: Number(id), tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } });
    if (!existingResult) throw new AppError('Exam result not found.', 404);

    const result = await prisma.examResult.update({
      where: { id: Number(id), tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: examResultSelect,
    });

    return formatExamResult(result);
  },
};
