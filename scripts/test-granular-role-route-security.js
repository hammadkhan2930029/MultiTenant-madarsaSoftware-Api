import assert from 'node:assert/strict';
import { authorizationService } from '../src/modules/rbac/authorization.service.js';
import { getSupportingReadPermissions } from '../src/modules/rbac/rbac.constants.js';
import { securityContextService } from '../src/modules/security/security-context.service.js';

const requiredFor = (method, originalUrl) => authorizationService.getRequiredPermissionForRequest({
  method,
  originalUrl,
});

const normalized = (value) => (Array.isArray(value) ? value : [value]);
const permits = (required, granted) => normalized(required).some((key) => granted.includes(key));

const teacherRead = requiredFor('GET', '/api/attendance/teachers');
const teacherWrite = requiredFor('POST', '/api/attendance/teachers');
const teacherDelete = requiredFor('DELETE', '/api/attendance/teachers');
const staffRead = requiredFor('GET', '/api/attendance/staff');
const staffWrite = requiredFor('POST', '/api/attendance/staff');
const staffDelete = requiredFor('DELETE', '/api/attendance/staff');
const studentRead = requiredFor('GET', '/api/attendance/students');
const studentWrite = requiredFor('POST', '/api/attendance/students');
const feeRead = requiredFor('GET', '/api/finance/student-fees');
const feeCollect = requiredFor('PATCH', '/api/finance/student-fees/7/payment');
const financeRead = requiredFor('GET', '/api/finance/transactions');

assert.equal(permits(teacherRead, ['teachers.attendance.view']), true);
assert.equal(permits(teacherWrite, ['teachers.attendance.create']), true);
assert.equal(permits(teacherWrite, ['teachers.attendance.edit']), true);
assert.equal(permits(teacherDelete, ['teachers.attendance.delete']), true);
assert.equal(permits(teacherWrite, ['teachers.attendance.view']), false);
assert.equal(permits(teacherDelete, ['teachers.attendance.view']), false);
assert.equal(permits(teacherRead, ['attendance.view']), false);
assert.equal(permits(teacherWrite, ['attendance.create']), false);

assert.equal(permits(staffRead, ['staff.attendance.view']), true);
assert.equal(permits(staffWrite, ['staff.attendance.create']), true);
assert.equal(permits(staffWrite, ['staff.attendance.edit']), true);
assert.equal(permits(staffDelete, ['staff.attendance.delete']), true);
assert.equal(permits(staffWrite, ['staff.attendance.view']), false);
assert.equal(permits(staffRead, ['attendance.view']), false);
assert.equal(permits(staffRead, ['teachers.attendance.view']), false);
assert.equal(permits(teacherRead, ['staff.attendance.view']), false);

const teacherSupportingReads = getSupportingReadPermissions('teachers');
assert.equal(teacherSupportingReads.includes('teachers.attendance.view'), true);
assert.equal(teacherSupportingReads.includes('teachers.attendance.create'), true);
assert.equal(teacherSupportingReads.includes('teachers.attendance.edit'), true);
assert.equal(teacherSupportingReads.includes('teachers.attendance.delete'), true);
assert.equal(teacherSupportingReads.includes('attendance.view'), false);

assert.equal(permits(studentRead, ['attendance.view']), true);
assert.equal(permits(studentWrite, ['attendance.create']), true);
assert.equal(permits(studentRead, ['teachers.attendance.view']), false);
assert.equal(permits(studentWrite, ['teachers.attendance.create']), false);

assert.equal(permits(feeRead, ['student_fees.view']), true);
assert.equal(permits(feeCollect, ['student_fees.collect']), true);
assert.equal(permits(feeRead, ['fees.view']), false);
assert.equal(permits(feeCollect, ['fees.create']), false);
assert.equal(permits(financeRead, ['student_fees.view']), false);
assert.equal(permits(financeRead, ['student_fees.collect']), false);

const customTenantRoleContext = securityContextService.buildAuthContext({
  tenantId: 11,
  admin: { tenantId: 11, branchId: null, role: 'incharge' },
  access: {
    role: { id: 77, tenantId: 11, branchId: null, roleName: 'incharge', status: 'active' },
    permissions: [],
    permissionKeys: [],
    classIds: [],
  },
});
assert.equal(customTenantRoleContext.roleScope, 'tenant');
assert.equal(customTenantRoleContext.isTenantAdmin, false);

const realTenantAdminContext = securityContextService.buildAuthContext({
  tenantId: 11,
  admin: { tenantId: 11, branchId: null, role: 'admin' },
  access: {
    role: { id: 1, tenantId: 11, branchId: null, roleName: 'admin', status: 'active' },
    permissions: [],
    permissionKeys: [],
    classIds: [],
  },
});
assert.equal(realTenantAdminContext.isTenantAdmin, true);

const selectedClassContext = securityContextService.buildAuthContext({
  tenantId: 11,
  admin: { tenantId: 11, branchId: 4, role: 'admin' },
  access: {
    role: {
      id: 78,
      tenantId: 11,
      branchId: 4,
      roleName: 'class_incharge',
      status: 'active',
      classScopeMode: 'selected',
    },
    permissions: [],
    permissionKeys: [],
    classIds: [9],
    teacherId: null,
  },
});
assert.equal(selectedClassContext.isTenantAdmin, false);
assert.equal(selectedClassContext.branchId, 4);
assert.equal(selectedClassContext.classScopeMode, 'selected');
assert.deepEqual(selectedClassContext.classIds, [9]);
assert.equal(selectedClassContext.teacherId, null);

console.log('Granular role route security checks passed.');
