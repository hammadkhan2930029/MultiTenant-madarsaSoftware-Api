import { AppError } from '../../utils/appError.js';

const normalizeClassIds = (branchScope = null) => (
  [...new Set((branchScope?.classIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))]
);

const isRestricted = (branchScope = null) => branchScope?.classScopeMode === 'selected';

const assertClassAccess = (classId, branchScope = null) => {
  if (!isRestricted(branchScope)) return Number(classId) || null;

  const resolvedClassId = Number(classId);
  if (!Number.isInteger(resolvedClassId) || !normalizeClassIds(branchScope).includes(resolvedClassId)) {
    throw new AppError('You do not have access to the selected class.', 403);
  }

  return resolvedClassId;
};

const buildClassIdWhere = (branchScope = null, field = 'classId') => (
  isRestricted(branchScope) ? { [field]: { in: normalizeClassIds(branchScope) } } : {}
);

export const classScopeService = {
  normalizeClassIds,
  isRestricted,
  assertClassAccess,
  buildClassIdWhere,
};
