import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { auditService, branchScopeService } from '../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);
  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }
  return resolvedTenantId;
};

const normalizeId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeText = (value) => String(value || '').trim();
const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;
const buildBranchScopeKey = (branchId) => `branch:${branchId}`;
const buildAssignmentScopeKey = ({ teacherId, subjectId, classId, sectionId, responsibilityId }) =>
  [teacherId, subjectId, classId, sectionId, responsibilityId].map(String).join(':');

const teacherAssignmentSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  teacherId: true,
  subjectId: true,
  classId: true,
  sectionId: true,
  responsibilityId: true,
  status: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, code: true, status: true } },
  teacher: { select: { id: true, fullName: true, phone: true, subject: true, staffType: true, status: true, branchId: true } },
  subject: { select: { id: true, name: true, status: true } },
  class: { select: { id: true, name: true, branchId: true, status: true } },
  section: { select: { id: true, name: true, classId: true, status: true } },
  responsibility: { select: { id: true, name: true, status: true } },
  creator: { select: { id: true, name: true, username: true } },
};

const responsibilitySelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const resolveRequestedBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  const scopedBranchId = getScopedBranchId(branchScope);
  const requestedBranchId = scopedBranchId || normalizeId(queryOrPayload.branchId);

  if (!requestedBranchId) return null;

  await branchScopeService.validateBranchBelongsToTenant({
    tenantId,
    branchId: requestedBranchId,
    requireActive: true,
  });

  return requestedBranchId;
};

const validateAssignmentReferences = async (tenantId, payload, branchScope = null) => {
  const scopedBranchId = getScopedBranchId(branchScope);
  const classId = normalizeId(payload.classId);
  const sectionId = normalizeId(payload.sectionId);
  const teacherId = normalizeId(payload.teacherId);

  const [academicClass, section, teacher] = await Promise.all([
    prisma.academicClass.findFirst({
      where: {
        id: classId,
        tenantId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
        status: 'active',
        branch: { status: 'active' },
      },
      select: { id: true, branchId: true, name: true },
    }),
    prisma.section.findFirst({
      where: { id: sectionId, tenantId, classId, status: 'active' },
      select: { id: true, classId: true, name: true },
    }),
    prisma.teacher.findFirst({
      where: {
        id: teacherId,
        tenantId,
        staffType: 'teacher',
        status: 'active',
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true, branchId: true, fullName: true },
    }),
  ]);

  if (!academicClass) {
    throw new AppError('منتخب جماعت دستیاب نہیں ہے۔', 403);
  }
  if (!section) {
    throw new AppError('منتخب سیکشن اس جماعت میں دستیاب نہیں ہے۔', 403);
  }
  if (!teacher) {
    throw new AppError('فعال استاد دستیاب نہیں ہے۔', 403);
  }
  if (!teacher.branchId || teacher.branchId !== academicClass.branchId) {
    throw new AppError('منتخب استاد اس جماعت کی برانچ سے متعلق نہیں ہے۔', 403);
  }

  return {
    teacher,
    academicClass,
    section,
    branchId: academicClass.branchId,
  };
};

const getActiveSubjects = async (tenantId, subjectIds) => {
  const normalizedIds = Array.from(new Set(subjectIds.map(normalizeId).filter(Boolean)));
  if (!normalizedIds.length) {
    throw new AppError('کم از کم ایک مضمون منتخب کریں۔', 400);
  }

  const subjects = await prisma.subject.findMany({
    where: { id: { in: normalizedIds }, tenantId, status: 'active' },
    select: { id: true, name: true },
  });

  if (subjects.length !== normalizedIds.length) {
    throw new AppError('منتخب مضمون دستیاب نہیں ہے۔', 403);
  }

  return subjects;
};

const getOrCreateResponsibilities = async (tx, tenantId, branchId, payload, adminId = null) => {
  const existingIds = Array.from(new Set((payload.responsibilityIds || []).map(normalizeId).filter(Boolean)));
  const names = Array.from(new Set((payload.responsibilities || []).map(normalizeText).filter(Boolean)));

  if (!existingIds.length && !names.length) {
    throw new AppError('کم از کم ایک ذمہ داری درج کریں۔', 400);
  }

  const branchScopeKey = buildBranchScopeKey(branchId);
  const existingResponsibilities = existingIds.length
    ? await tx.teacherResponsibility.findMany({
        where: { id: { in: existingIds }, tenantId, branchId, status: 'active' },
        select: responsibilitySelect,
      })
    : [];

  if (existingResponsibilities.length !== existingIds.length) {
    throw new AppError('منتخب ذمہ داری دستیاب نہیں ہے۔', 403);
  }

  const createdOrMatched = [];
  for (const name of names) {
    const matched = await tx.teacherResponsibility.findFirst({
      where: { tenantId, branchScopeKey, name },
      select: responsibilitySelect,
    });

    if (matched) {
      if (matched.status !== 'active') {
        createdOrMatched.push(await tx.teacherResponsibility.update({
          where: { id: matched.id },
          data: { status: 'active' },
          select: responsibilitySelect,
        }));
      } else {
        createdOrMatched.push(matched);
      }
      continue;
    }

    createdOrMatched.push(await tx.teacherResponsibility.create({
      data: {
        tenantId,
        branchId,
        branchScopeKey,
        name,
        createdBy: adminId,
      },
      select: responsibilitySelect,
    }));
  }

  return [...existingResponsibilities, ...createdOrMatched];
};

const assertAssignmentInScope = async (tenantId, id, branchScope = null) => {
  const scopedBranchId = getScopedBranchId(branchScope);
  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      id: Number(id),
      tenantId,
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    },
    select: teacherAssignmentSelect,
  });

  if (!assignment) {
    throw new AppError('تقسیم کا ریکارڈ نہیں ملا۔', 404);
  }

  return assignment;
};

const recordAssignmentAudit = async (client, reqContext, action, oldValue, newValue) => {
  await auditService.recordAuditLog(client, {
    tenantId: reqContext?.tenantId,
    actorUserId: reqContext?.adminId,
    branchId: newValue?.branchId || oldValue?.branchId || reqContext?.branchId || null,
    roleId: reqContext?.roleId || null,
    action,
    module: 'teacher_assignments',
    targetType: 'teacher_assignment',
    targetId: newValue?.id || oldValue?.id || null,
    oldValue,
    newValue,
    ipAddress: reqContext?.ipAddress || null,
    userAgent: reqContext?.userAgent || null,
  });
};

export const teacherAssignmentsService = {
  async getResponsibilities(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveRequestedBranchId(resolvedTenantId, query, branchScope);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search } } : {}),
    };

    const { page, limit, skip } = getPagination(query.page, query.limit);
    const [items, totalItems] = await Promise.all([
      prisma.teacherResponsibility.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        select: responsibilitySelect,
      }),
      prisma.teacherResponsibility.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getTeacherAssignments(tenantId, query = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveRequestedBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      ...(query.teacherId ? { teacherId: Number(query.teacherId) } : {}),
      ...(query.subjectId ? { subjectId: Number(query.subjectId) } : {}),
      ...(query.classId ? { classId: Number(query.classId) } : {}),
      ...(query.sectionId ? { sectionId: Number(query.sectionId) } : {}),
      ...(query.responsibilityId ? { responsibilityId: Number(query.responsibilityId) } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { teacher: { fullName: { contains: query.search } } },
              { subject: { name: { contains: query.search } } },
              { class: { name: { contains: query.search } } },
              { section: { name: { contains: query.search } } },
              { responsibility: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacherAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: teacherAssignmentSelect,
      }),
      prisma.teacherAssignment.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getTeacherAssignmentById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return assertAssignmentInScope(resolvedTenantId, id, branchScope);
  },

  async createTeacherAssignments(tenantId, payload, reqContext = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const references = await validateAssignmentReferences(resolvedTenantId, payload, branchScope);
    const branchId = references.branchId;
    await branchScopeService.validateBranchBelongsToTenant({ tenantId: resolvedTenantId, branchId, requireActive: true });
    const subjects = await getActiveSubjects(resolvedTenantId, payload.subjectIds || []);

    return prisma.$transaction(async (tx) => {
      const responsibilities = await getOrCreateResponsibilities(tx, resolvedTenantId, branchId, payload, reqContext?.adminId || null);
      const rows = [];
      const rowErrors = [];
      const seenKeys = new Set();

      for (const subject of subjects) {
        for (const responsibility of responsibilities) {
          const assignmentScopeKey = buildAssignmentScopeKey({
            teacherId: references.teacher.id,
            subjectId: subject.id,
            classId: references.academicClass.id,
            sectionId: references.section.id,
            responsibilityId: responsibility.id,
          });

          if (seenKeys.has(assignmentScopeKey)) continue;
          seenKeys.add(assignmentScopeKey);

          const duplicate = await tx.teacherAssignment.findFirst({
            where: { tenantId: resolvedTenantId, branchId, assignmentScopeKey },
            select: { id: true, status: true },
          });

          if (duplicate?.status === 'active') {
            rowErrors.push({ subjectId: subject.id, responsibilityId: responsibility.id, message: 'یہ تقسیم پہلے سے موجود ہے۔' });
            continue;
          }

          if (duplicate) {
            rows.push(await tx.teacherAssignment.update({
              where: { id: duplicate.id },
              data: { status: payload.status || 'active', createdBy: reqContext?.adminId || null },
              select: teacherAssignmentSelect,
            }));
            continue;
          }

          rows.push(await tx.teacherAssignment.create({
            data: {
              tenantId: resolvedTenantId,
              branchId,
              branchScopeKey: buildBranchScopeKey(branchId),
              teacherId: references.teacher.id,
              subjectId: subject.id,
              classId: references.academicClass.id,
              sectionId: references.section.id,
              responsibilityId: responsibility.id,
              assignmentScopeKey,
              status: payload.status || 'active',
              createdBy: reqContext?.adminId || null,
            },
            select: teacherAssignmentSelect,
          }));
        }
      }

      if (rowErrors.length) {
        throw new AppError('درج کردہ تقسیم میں ڈپلیکیٹ ریکارڈ موجود ہے۔', 409, { rows: rowErrors });
      }

      await recordAssignmentAudit(tx, { ...reqContext, tenantId: resolvedTenantId, branchId }, 'teacher_assignment.created', null, { createdCount: rows.length, branchId });
      return { items: rows, createdCount: rows.length };
    });
  },

  async updateTeacherAssignment(tenantId, id, payload, reqContext = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await assertAssignmentInScope(resolvedTenantId, id, branchScope);
    const references = await validateAssignmentReferences(resolvedTenantId, {
      teacherId: payload.teacherId || existing.teacherId,
      classId: payload.classId || existing.classId,
      sectionId: payload.sectionId || existing.sectionId,
    }, branchScope);
    const branchId = references.branchId;
    const subject = (await getActiveSubjects(resolvedTenantId, [payload.subjectId || existing.subjectId]))[0];
    const responsibilityPayload = payload.responsibility
      ? { responsibilityIds: [], responsibilities: [payload.responsibility] }
      : { responsibilityIds: [payload.responsibilityId || existing.responsibilityId].filter(Boolean), responsibilities: [] };
    const responsibilities = await prisma.$transaction((tx) =>
      getOrCreateResponsibilities(tx, resolvedTenantId, branchId, responsibilityPayload, reqContext?.adminId || null)
    );
    const responsibility = responsibilities[0];
    const assignmentScopeKey = buildAssignmentScopeKey({
      teacherId: references.teacher.id,
      subjectId: subject.id,
      classId: references.academicClass.id,
      sectionId: references.section.id,
      responsibilityId: responsibility.id,
    });

    const duplicate = await prisma.teacherAssignment.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        assignmentScopeKey,
        id: { not: Number(id) },
        status: 'active',
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new AppError('یہ تقسیم پہلے سے موجود ہے۔', 409);
    }

    const updated = await prisma.teacherAssignment.update({
      where: { id: Number(id), tenantId: resolvedTenantId },
      data: {
        branchId,
        branchScopeKey: buildBranchScopeKey(branchId),
        teacherId: references.teacher.id,
        subjectId: subject.id,
        classId: references.academicClass.id,
        sectionId: references.section.id,
        responsibilityId: responsibility.id,
        assignmentScopeKey,
        status: payload.status || existing.status,
      },
      select: teacherAssignmentSelect,
    });

    await recordAssignmentAudit(prisma, { ...reqContext, tenantId: resolvedTenantId, branchId }, 'teacher_assignment.updated', existing, updated);
    return updated;
  },

  async updateTeacherAssignmentStatus(tenantId, id, status, reqContext = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await assertAssignmentInScope(resolvedTenantId, id, branchScope);
    const updated = await prisma.teacherAssignment.update({
      where: { id: Number(id), tenantId: resolvedTenantId },
      data: { status },
      select: teacherAssignmentSelect,
    });
    await recordAssignmentAudit(prisma, { ...reqContext, tenantId: resolvedTenantId, branchId: updated.branchId }, 'teacher_assignment.status_updated', existing, updated);
    return updated;
  },

  async deleteTeacherAssignment(tenantId, id, reqContext = {}, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await assertAssignmentInScope(resolvedTenantId, id, branchScope);
    const updated = await prisma.teacherAssignment.update({
      where: { id: Number(id), tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: teacherAssignmentSelect,
    });
    await recordAssignmentAudit(prisma, { ...reqContext, tenantId: resolvedTenantId, branchId: updated.branchId }, 'teacher_assignment.removed', existing, updated);
    return updated;
  },
};
