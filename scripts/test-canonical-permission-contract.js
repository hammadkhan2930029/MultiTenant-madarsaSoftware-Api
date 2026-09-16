import assert from 'node:assert/strict';
import { requirePermission } from '../src/middlewares/authorization.middleware.js';
import { authorizationService } from '../src/modules/rbac/authorization.service.js';
import { getSupportingReadPermissions } from '../src/modules/rbac/rbac.constants.js';

const runMiddleware = (permission, permissions) => {
  let nextError;
  let nextCalled = false;
  requirePermission(permission)(
    { auth: { permissions, isSuperAdmin: false, isTenantAdmin: false } },
    {},
    (error) => {
      nextCalled = true;
      nextError = error;
    },
  );
  return { nextCalled, nextError };
};

const expectAllowed = (permission, permissions) => {
  const result = runMiddleware(permission, permissions);
  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, undefined);
};

const expectForbidden = (permission, permissions) => {
  const result = runMiddleware(permission, permissions);
  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError?.statusCode, 403);
};

expectAllowed('finance.heads.view', ['finance.heads.view']);
expectForbidden('finance.heads.edit', ['finance.heads.view']);
expectAllowed('finance.heads.edit', ['finance.heads.edit']);

expectAllowed('finance.transactions.view', ['finance.transactions.view']);
expectForbidden('finance.transactions.create', ['finance.transactions.view']);
expectAllowed('finance.transactions.create', ['finance.transactions.create']);

assert.equal(
  authorizationService.getRequiredPermissionForRequest({ originalUrl: '/api/finance/heads', method: 'POST' }),
  'finance.heads.edit',
);
assert.equal(
  authorizationService.getRequiredPermissionForRequest({ originalUrl: '/api/finance/heads/1', method: 'PUT' }),
  'finance.heads.edit',
);
assert.equal(
  authorizationService.getRequiredPermissionForRequest({ originalUrl: '/api/finance/expense-categories/1', method: 'DELETE' }),
  'finance.heads.edit',
);
assert.equal(
  authorizationService.getRequiredPermissionForRequest({ originalUrl: '/api/finance/transactions/1', method: 'PUT' }),
  'finance.transactions.create',
);
assert.equal(
  authorizationService.getRequiredPermissionForRequest({ originalUrl: '/api/finance/transactions/1', method: 'DELETE' }),
  'finance.transactions.create',
);

assert.equal(getSupportingReadPermissions('students').includes('students.update'), false);
assert.equal(getSupportingReadPermissions('students').includes('students.edit'), true);
assert.equal(getSupportingReadPermissions('students').includes('attendance.mark'), false);
assert.equal(getSupportingReadPermissions('students').includes('attendance.create'), true);
assert.equal(getSupportingReadPermissions('students').includes('attendance.edit'), true);

console.log('Canonical permission contract checks passed.');
