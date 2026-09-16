import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';

const ACTIVE_STATUS = 'active';

const normalizePositiveClassId = (classId) => {
  const resolvedClassId = Number(classId);
  if (!Number.isInteger(resolvedClassId) || resolvedClassId <= 0) {
    throw new AppError('The selected class is not valid.', 400);
  }
  return resolvedClassId;
};

const normalizeClassIds = (branchScope = null) => (
  [...new Set((branchScope?.classIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))]
);

const isRestricted = (branchScope = null) => branchScope?.classScopeMode === 'selected';

const assertClassAccess = (classId, branchScope = null) => {
  const resolvedClassId = normalizePositiveClassId(classId);
  if (!isRestricted(branchScope)) return resolvedClassId;

  if (!normalizeClassIds(branchScope).includes(resolvedClassId)) {
    throw new AppError('You do not have access to the selected class.', 403);
  }

  return resolvedClassId;
};

const buildClassIdWhere = (branchScope = null, field = 'classId') => (
  isRestricted(branchScope) ? { [field]: { in: normalizeClassIds(branchScope) } } : {}
);

const buildActiveAssignmentWhere = (branchScope = null, options = {}) => {
  const requestedClassId = options.classId === null || options.classId === undefined || options.classId === ''
    ? null
    : assertClassAccess(options.classId, branchScope);

  return {
    status: options.status || ACTIVE_STATUS,
    ...(options.tenantId ? { tenantId: Number(options.tenantId) } : {}),
    ...(options.branchId ? { branchId: Number(options.branchId) } : {}),
    ...(requestedClassId
      ? { classId: requestedClassId }
      : buildClassIdWhere(branchScope)),
    ...(options.sectionId ? { sectionId: Number(options.sectionId) } : {}),
    ...(options.sessionId ? { sessionId: Number(options.sessionId) } : {}),
  };
};

const buildStudentClassScopeWhere = (branchScope = null, options = {}) => (
  isRestricted(branchScope) || options.classId || options.branchId || options.sectionId || options.sessionId
    ? { assignments: { some: buildActiveAssignmentWhere(branchScope, options) } }
    : {}
);

const buildTeacherClassScopeWhere = (branchScope = null) => (
  isRestricted(branchScope)
    ? {
        OR: [
          {
            teachingAssignments: {
              some: {
                status: ACTIVE_STATUS,
                classId: { in: normalizeClassIds(branchScope) },
              },
            },
          },
          {
            inchargeClasses: {
              some: {
                status: ACTIVE_STATUS,
                id: { in: normalizeClassIds(branchScope) },
              },
            },
          },
          {
            roleClassAssignments: {
              some: {
                classId: { in: normalizeClassIds(branchScope) },
              },
            },
          },
        ],
      }
    : {}
);

const validateClassAccess = async ({
  tenantId,
  branchId,
  classId,
  requireActive = true,
  client = prisma,
  branchScope = null,
} = {}) => {
  const resolvedClassId = assertClassAccess(classId, branchScope);
  const resolvedTenantId = Number(tenantId);
  const resolvedBranchId = Number(branchId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }
  if (!Number.isInteger(resolvedBranchId) || resolvedBranchId <= 0) {
    throw new AppError('Branch context is required.', 403);
  }

  const academicClass = await client.academicClass.findFirst({
    where: {
      id: resolvedClassId,
      tenantId: resolvedTenantId,
      branchId: resolvedBranchId,
      ...(requireActive ? { status: ACTIVE_STATUS } : {}),
    },
    select: { id: true, tenantId: true, branchId: true, status: true },
  });

  if (!academicClass) {
    throw new AppError('The selected class is not available in the current branch.', 403);
  }

  return academicClass;
};

export const classScopeService = {
  normalizeClassIds,
  isRestricted,
  assertClassAccess,
  buildClassIdWhere,
  buildActiveAssignmentWhere,
  buildStudentClassScopeWhere,
  buildTeacherClassScopeWhere,
  validateClassAccess,
};
