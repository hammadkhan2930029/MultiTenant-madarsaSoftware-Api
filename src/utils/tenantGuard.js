import { AppError } from './appError.js';

export const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

export const tenantScopedWhere = (tenantId, where = {}) => ({
  ...where,
  tenantId: normalizeTenantId(tenantId),
});

export const tenantRelationWhere = (tenantId, relationName = 'student', where = {}) => ({
  ...where,
  [relationName]: tenantScopedWhere(tenantId),
});

export const findTenantRecordOrThrow = async (
  model,
  tenantId,
  where,
  {
    select,
    include,
    relationName = null,
    message = 'Record not found.',
  } = {}
) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  const guardedWhere = relationName
    ? tenantRelationWhere(resolvedTenantId, relationName, where)
    : tenantScopedWhere(resolvedTenantId, where);

  const record = await model.findFirst({
    where: guardedWhere,
    ...(select ? { select } : {}),
    ...(include ? { include } : {}),
  });

  if (!record) {
    throw new AppError(message, 404);
  }

  return record;
};

export const updateTenantRecordOrThrow = async (
  model,
  tenantId,
  id,
  data,
  {
    select,
    include,
    idField = 'id',
    relationName = null,
    message = 'Record not found.',
  } = {}
) => {
  const record = await findTenantRecordOrThrow(model, tenantId, { [idField]: Number(id) }, { relationName, message });

  return model.update({
    where: { [idField]: record[idField] },
    data,
    ...(select ? { select } : {}),
    ...(include ? { include } : {}),
  });
};

export const deleteTenantRecordOrThrow = async (
  model,
  tenantId,
  id,
  {
    select,
    include,
    idField = 'id',
    relationName = null,
    message = 'Record not found.',
  } = {}
) => {
  const record = await findTenantRecordOrThrow(model, tenantId, { [idField]: Number(id) }, { relationName, message });

  return model.delete({
    where: { [idField]: record[idField] },
    ...(select ? { select } : {}),
    ...(include ? { include } : {}),
  });
};
