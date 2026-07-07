import { permissionsService } from '../src/modules/permissions/permissions.service.js';

const results = [];

const pass = (name, details = '') => {
  results.push({ status: 'PASS', name, details });
};

const fail = (name, details = '') => {
  results.push({ status: 'FAIL', name, details });
  throw new Error(`${name}${details ? `: ${details}` : ''}`);
};

const assert = (condition, name, details = '') => {
  if (!condition) fail(name, details);
  pass(name, details);
};

const run = async () => {
  const permissions = await permissionsService.getPermissions();
  const grouped = await permissionsService.getGroupedPermissions();

  assert(Array.isArray(permissions) && permissions.length > 0, 'Flat permissions list is available');
  assert(Array.isArray(grouped) && grouped.length > 0, 'Grouped permissions list is available');

  const studentPermission = permissions.find((permission) => permission.key === 'students.view');
  assert(Boolean(studentPermission), 'students.view permission is exposed');
  assert(Boolean(studentPermission.module), 'Flat permission has module');
  assert(Boolean(studentPermission.moduleLabel), 'Flat permission has moduleLabel');
  assert(Boolean(studentPermission.action), 'Flat permission has action');
  assert(Boolean(studentPermission.label), 'Flat permission has label');

  const studentsGroup = grouped.find((group) => group.module === 'students');
  assert(Boolean(studentsGroup), 'Students group is available');
  assert(Array.isArray(studentsGroup.permissions), 'Grouped response has permissions array');
  assert(studentsGroup.permissions.some((permission) => permission.key === 'students.view'), 'Students group contains students.view');
  assert(studentsGroup.permissions.every((permission) => !Object.prototype.hasOwnProperty.call(permission, 'tenantId')), 'Permissions are global and tenant-free in response');

  console.log('\nPermission API service test results');
  console.log('===================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run().catch((error) => {
  console.error('Permission API service test failed');
  console.error(error);
  for (const result of results) {
    console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
  process.exitCode = 1;
});
