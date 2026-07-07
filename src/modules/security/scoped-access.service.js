import { AppError } from '../../utils/appError.js';

const normalizeId = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

const hasScope = (allowedIds = [], value) => {
  const normalizedValue = normalizeId(value);
  if (!normalizedValue) return true;
  if (!allowedIds.length) return true;
  return allowedIds.map(Number).includes(normalizedValue);
};

export const scopedAccessService = {
  assertBranchAccess(branchId, securityContext = {}) {
    if (hasScope(securityContext.scopes?.branchIds || [], branchId)) return;
    throw new AppError('You do not have access to this branch.', 403);
  },

  assertDepartmentAccess(departmentId, securityContext = {}) {
    if (hasScope(securityContext.scopes?.departmentIds || [], departmentId)) return;
    throw new AppError('You do not have access to this department.', 403);
  },
};
