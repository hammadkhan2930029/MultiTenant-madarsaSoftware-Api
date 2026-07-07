import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { studentFeesService } from '../src/modules/finance/student-fees/studentFees.service.js';
import { rolesService } from '../src/modules/roles/roles.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { storeService } from '../src/modules/store/store.service.js';
import { studentsService } from '../src/modules/students/students.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt18@123';
const results = [];

const TENANTS = [
  { tenantCode: 'qa_rbac_suite_jamia1', name: 'QA RBAC Suite Jamia 1', subdomain: 'rbac-suite-jamia1' },
  { tenantCode: 'qa_rbac_suite_jamia2', name: 'QA RBAC Suite Jamia 2', subdomain: 'rbac-suite-jamia2' },
];

const pass = (name, details = '') => results.push({ status: 'PASS', name, details });
const fail = (name, details = '') => {
  results.push({ status: 'FAIL', name, details });
  throw new Error(`${name}${details ? `: ${details}` : ''}`);
};
const assert = (condition, name, details = '') => {
  if (!condition) fail(name, details);
  pass(name, details);
};

const upsertTenant = async ({ tenantCode, name, subdomain }) => {
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode },
    update: { name, subdomain, customDomain: null, status: 'active' },
    create: { tenantCode, name, subdomain, status: 'active' },
  });

  await seedDefaultTenantRoles(prisma, tenant.id);
  return tenant;
};

const getRole = async (tenantId, roleName) => {
  const role = await prisma.role.findFirst({
    where: { tenantId, roleName },
    select: { id: true, roleName: true },
  });

  if (!role) throw new Error(`Missing ${roleName} role for tenant ${tenantId}`);
  return role;
};

const upsertAdmin = async ({ tenant, roleName = 'admin', username, status = 'active' }) => {
  const role = await getRole(tenant.id, roleName);
  const password = await bcrypt.hash(PASSWORD, 12);
  const email = `${username}@example.test`;
  const existing = await prisma.admin.findFirst({ where: { tenantId: tenant.id, username } });
  const data = {
    name: username,
    email,
    username,
    password,
    role: role.roleName,
    roleId: role.id,
    tenantId: tenant.id,
    status,
  };

  return existing
    ? prisma.admin.update({ where: { id: existing.id }, data })
    : prisma.admin.create({ data });
};

const requester = (tenant, admin) => ({
  tenantId: tenant.id,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin,
  audit: {
    ipAddress: '127.0.0.18',
    userAgent: 'prompt-18-rbac-suite',
  },
});

const login = (tenant, username) => authService.loginAdmin(
  { identity: username, password: PASSWORD },
  { tenantId: tenant.id, isSystemHost: false },
);

const runAuthMiddleware = async ({ tenant, token, method, originalUrl }) => {
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method,
    originalUrl,
    tenantId: tenant.id,
    tenant: { id: tenant.id, status: tenant.status },
    tenantHost: { isSystemHost: false },
    ip: '127.0.0.18',
  };

  const error = await new Promise((resolve) => {
    authMiddleware(req, {}, (nextError) => resolve(nextError || null));
  });

  return { req, error };
};

const cleanup = async (tenantIds) => {
  for (const tenantId of tenantIds) {
    await prisma.$executeRaw`
      DELETE FROM audit_logs
      WHERE tenant_id = ${tenantId}
        AND user_agent = 'prompt-18-rbac-suite'
    `;
    await prisma.$executeRaw`
      DELETE FROM admins
      WHERE tenant_id = ${tenantId}
        AND username LIKE 'qa-rbac-suite-%'
    `;
    await prisma.$executeRaw`
      DELETE FROM roles
      WHERE tenant_id = ${tenantId}
        AND role_name LIKE 'qa_rbac_suite_%'
        AND is_system_role = false
    `;
    await prisma.$executeRaw`
      DELETE FROM student_fee_vouchers
      WHERE tenant_id = ${tenantId}
        AND feeYear = 2099
    `;
    await prisma.$executeRaw`
      DELETE FROM students
      WHERE tenant_id = ${tenantId}
        AND admissionNumber LIKE 'QA-RBAC18-%'
    `;
    await prisma.$executeRaw`
      DELETE FROM store_items
      WHERE tenant_id = ${tenantId}
        AND itemCode LIKE 'QA-RBAC18-%'
    `;
  }
};

const ensureStudent = (tenant, suffix) => studentsService.createStudent(tenant.id, {
  body: {
    admissionNumber: `QA-RBAC18-${suffix}`,
    fullName: `QA RBAC Suite Student ${suffix}`,
    fatherName: 'QA Father',
    gender: 'male',
    phone: `0318${String(tenant.id).padStart(7, '0')}`.slice(0, 11),
    monthlyFee: 100,
  },
  file: null,
});

const ensureStoreItem = (tenant, suffix) => storeService.createItem(tenant.id, {
  itemName: `QA RBAC Item ${suffix}`,
  category: 'QA',
  unit: 'piece',
  itemCode: `QA-RBAC18-${suffix}`,
  quantity: 10,
  purchasePrice: 5,
});

const run = async () => {
  const jamia1 = await upsertTenant(TENANTS[0]);
  const jamia2 = await upsertTenant(TENANTS[1]);
  await cleanup([jamia1.id, jamia2.id]);

  const jamia1Admin = await upsertAdmin({ tenant: jamia1, username: 'qa-rbac-suite-admin' });
  const jamia2Admin = await upsertAdmin({ tenant: jamia2, username: 'qa-rbac-suite-admin' });
  const auth1 = requester(jamia1, jamia1Admin);
  const auth2 = requester(jamia2, jamia2Admin);

  const jamia1Role = await rolesService.createRole({
    roleName: 'qa_rbac_suite_operator',
    permissions: ['students.view'],
  }, auth1);
  assert(jamia1Role.tenantId === jamia1.id, 'Tenant Admin can create role in own tenant');

  let crossTenantRoleBlocked = false;
  try {
    await rolesService.getRoleById(jamia1Role.id, auth2);
  } catch (error) {
    crossTenantRoleBlocked = error?.statusCode === 404;
  }
  assert(crossTenantRoleBlocked, 'Tenant Admin cannot access another tenant role');

  const assignedRole = await rolesService.assignPermissionsToRole(jamia1Role.id, {
    permissions: ['students.view', 'attendance.mark'],
  }, auth1);
  const assignedKeys = assignedRole.permissions.map((permission) => permission.permissionKey);
  assert(assignedKeys.includes('attendance.mark'), 'Tenant Admin can assign permissions to own role');

  let invalidPermissionRejected = false;
  try {
    await rolesService.assignPermissionsToRole(jamia1Role.id, { permissions: ['missing.permission'] }, auth1);
  } catch (error) {
    invalidPermissionRejected = error?.statusCode === 400;
  }
  assert(invalidPermissionRejected, 'Invalid permission key rejected');

  const createdUser = await usersService.createUser({
    name: 'QA RBAC Suite User',
    email: 'qa-rbac-suite-user@example.test',
    username: 'qa-rbac-suite-user',
    password: PASSWORD,
    roleId: jamia1Role.id,
    status: 'active',
  }, auth1);
  assert(createdUser.tenantId === jamia1.id && createdUser.roleId === jamia1Role.id, 'Tenant Admin can create user with own tenant role');

  const jamia2Role = await getRole(jamia2.id, 'teacher');
  let crossTenantAssignBlocked = false;
  try {
    await usersService.assignRole(createdUser.id, { roleId: jamia2Role.id }, auth1);
  } catch (error) {
    crossTenantAssignBlocked = error?.statusCode === 400;
  }
  assert(crossTenantAssignBlocked, 'Cannot assign Jamia2 role to Jamia1 user');

  const noPermissionRole = await rolesService.createRole({
    roleName: 'qa_rbac_suite_no_permissions',
    permissions: [],
  }, auth1);
  await usersService.createUser({
    name: 'QA RBAC Suite No Permission',
    email: 'qa-rbac-suite-no-permission@example.test',
    username: 'qa-rbac-suite-no-permission',
    password: PASSWORD,
    roleId: noPermissionRole.id,
    status: 'active',
  }, auth1);

  const noPermissionLogin = await login(jamia1, 'qa-rbac-suite-no-permission');
  const deniedApi = await runAuthMiddleware({
    tenant: jamia1,
    token: noPermissionLogin.token,
    method: 'GET',
    originalUrl: '/api/students',
  });
  assert(deniedApi.error?.statusCode === 403, 'User without permission gets 403');

  const allowedLogin = await login(jamia1, 'qa-rbac-suite-user');
  const allowedApi = await runAuthMiddleware({
    tenant: jamia1,
    token: allowedLogin.token,
    method: 'GET',
    originalUrl: '/api/students',
  });
  assert(!allowedApi.error, 'User with permission gets allowed');

  const jamia1Student = await ensureStudent(jamia1, 'J1');
  await ensureStudent(jamia2, 'J2');
  let crossStudentBlocked = false;
  try {
    await studentsService.getStudentById(jamia2.id, jamia1Student.id);
  } catch (error) {
    crossStudentBlocked = error?.statusCode === 404;
  }
  assert(crossStudentBlocked, 'Jamia1 token cannot access Jamia2 student data');

  const feeMonth = 1;
  const feeYear = 2099;
  await studentFeesService.generateFees(jamia1.id, { feeMonth, feeYear, overwrite: true });
  await studentFeesService.generateFees(jamia2.id, { feeMonth, feeYear, overwrite: true });
  const jamia1Fees = await studentFeesService.getFees(jamia1.id, { search: 'QA RBAC Suite Student', page: 1, limit: 20 });
  const jamia2Fees = await studentFeesService.getFees(jamia2.id, { search: 'QA RBAC Suite Student', page: 1, limit: 20 });
  let crossFeeBlocked = false;
  try {
    await studentFeesService.getFeeById(jamia2.id, jamia1Fees.items[0]?.id);
  } catch (error) {
    crossFeeBlocked = error?.statusCode === 404;
  }
  assert(
    jamia1Fees.items.length > 0 &&
      jamia2Fees.items.length > 0 &&
      jamia1Fees.items.every((fee) => fee.tenantId === jamia1.id) &&
      jamia2Fees.items.every((fee) => fee.tenantId === jamia2.id) &&
      crossFeeBlocked,
    'Jamia1 token cannot access Jamia2 fees data',
  );

  const jamia1Item = await ensureStoreItem(jamia1, 'J1');
  await ensureStoreItem(jamia2, 'J2');
  let crossStoreBlocked = false;
  try {
    await storeService.getItemById(jamia2.id, jamia1Item.id);
  } catch (error) {
    crossStoreBlocked = error?.statusCode === 404;
  }
  assert(crossStoreBlocked, 'Jamia1 token cannot access Jamia2 store data');

  const readOnlyLogin = await login(jamia1, 'qa-rbac-suite-admin').then(async () => {
    await usersService.createUser({
      name: 'QA RBAC Suite Read Only',
      email: 'qa-rbac-suite-readonly@example.test',
      username: 'qa-rbac-suite-readonly',
      password: PASSWORD,
      roleId: (await getRole(jamia1.id, 'read_only')).id,
      status: 'active',
    }, auth1);
    return login(jamia1, 'qa-rbac-suite-readonly');
  });

  const readOnlyCreate = await runAuthMiddleware({
    tenant: jamia1,
    token: readOnlyLogin.token,
    method: 'POST',
    originalUrl: '/api/students',
  });
  const readOnlyUpdate = await runAuthMiddleware({
    tenant: jamia1,
    token: readOnlyLogin.token,
    method: 'PUT',
    originalUrl: `/api/students/${jamia1Student.id}`,
  });
  const readOnlyDelete = await runAuthMiddleware({
    tenant: jamia1,
    token: readOnlyLogin.token,
    method: 'DELETE',
    originalUrl: `/api/students/${jamia1Student.id}`,
  });
  assert(
    readOnlyCreate.error?.statusCode === 403 &&
      readOnlyUpdate.error?.statusCode === 403 &&
      readOnlyDelete.error?.statusCode === 403,
    'Read Only role cannot create/update/delete',
  );

  const inactiveRole = await rolesService.createRole({
    roleName: 'qa_rbac_suite_inactive_role',
    permissions: ['students.view'],
  }, auth1);
  await usersService.createUser({
    name: 'QA RBAC Suite Inactive Role',
    email: 'qa-rbac-suite-inactive-role@example.test',
    username: 'qa-rbac-suite-inactive-role',
    password: PASSWORD,
    roleId: inactiveRole.id,
    status: 'active',
  }, auth1);
  await rolesService.updateRole(inactiveRole.id, { status: 'inactive' }, auth1);
  let inactiveRoleBlocked = false;
  try {
    await login(jamia1, 'qa-rbac-suite-inactive-role');
  } catch (error) {
    inactiveRoleBlocked = error?.statusCode === 403;
  }

  await usersService.createUser({
    name: 'QA RBAC Suite Inactive User',
    email: 'qa-rbac-suite-inactive-user@example.test',
    username: 'qa-rbac-suite-inactive-user',
    password: PASSWORD,
    roleId: jamia1Role.id,
    status: 'inactive',
  }, auth1);
  let inactiveUserBlocked = false;
  try {
    await login(jamia1, 'qa-rbac-suite-inactive-user');
  } catch (error) {
    inactiveUserBlocked = error?.statusCode === 403;
  }
  assert(inactiveRoleBlocked && inactiveUserBlocked, 'Inactive role/user blocked');

  await cleanup([jamia1.id, jamia2.id]);

  console.log('\nRBAC backend suite test results');
  console.log('===============================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('RBAC backend suite failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
