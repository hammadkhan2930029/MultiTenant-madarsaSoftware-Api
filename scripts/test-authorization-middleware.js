import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';

const PASSWORD = 'Prompt14@123';
const TENANT_CODE = 'qa_authz_jamia1';
const OTHER_TENANT_CODE = 'qa_authz_jamia2';
const results = [];

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

  if (!role) throw new Error(`Missing role ${roleName}`);
  return role;
};

const createRole = async (tenantId, roleName, permissionKeys = []) => {
  await prisma.$executeRaw`
    DELETE FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name = ${roleName}
      AND is_system_role = false
  `;

  await prisma.$executeRaw`
    INSERT INTO roles (tenant_id, role_name, description, status, is_system_role)
    VALUES (${tenantId}, ${roleName}, ${`${roleName} test role`}, 'active', false)
  `;

  const role = await prisma.role.findFirst({
    where: { tenantId, roleName },
    select: { id: true, roleName: true },
  });

  for (const permissionKey of permissionKeys) {
    await prisma.$executeRaw`
      INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
      SELECT ${tenantId}, ${role.id}, p.id
      FROM permissions p
      WHERE p.permission_key = ${permissionKey}
    `;
  }

  return role;
};

const upsertAdmin = async ({ tenantId, role, username, status = 'active' }) => {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const email = `${username}@example.test`;
  const existing = await prisma.admin.findFirst({ where: { tenantId, username } });

  const data = {
    name: username,
    email,
    username,
    password: hashedPassword,
    role: role.roleName,
    roleId: role.id,
    tenantId,
    status,
  };

  if (existing) {
    return prisma.admin.update({ where: { id: existing.id }, data });
  }

  return prisma.admin.create({ data });
};

const login = (tenant, username) => authService.loginAdmin(
  { identity: username, password: PASSWORD },
  { tenantId: tenant.id, isSystemHost: false },
);

const runAuthMiddleware = async ({ tenant, token, method = 'GET', originalUrl = '/api/students' }) => {
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method,
    originalUrl,
    tenantId: tenant.id,
    tenant: { id: tenant.id, status: tenant.status },
    tenantHost: { isSystemHost: false },
    ip: '127.0.0.1',
  };

  const nextError = await new Promise((resolve) => {
    authMiddleware(req, {}, (error) => {
      resolve(error || null);
    });
  });

  return { req, error: nextError };
};

const run = async () => {
  const tenant = await upsertTenant({ tenantCode: TENANT_CODE, name: 'QA Authz Jamia 1', subdomain: 'authz-jamia1' });
  const otherTenant = await upsertTenant({ tenantCode: OTHER_TENANT_CODE, name: 'QA Authz Jamia 2', subdomain: 'authz-jamia2' });
  const teacherRole = await getRole(tenant.id, 'teacher');
  const accountantRole = await getRole(tenant.id, 'accountant');
  const readOnlyRole = await getRole(tenant.id, 'read_only');
  const otherTeacherRole = await getRole(otherTenant.id, 'teacher');
  const noPermissionRole = await createRole(tenant.id, 'qa_no_permissions', []);
  const customRole = await createRole(tenant.id, 'qa_students_view', ['students.view']);

  await upsertAdmin({ tenantId: tenant.id, role: teacherRole, username: 'qa-authz-allowed' });
  await upsertAdmin({ tenantId: tenant.id, role: accountantRole, username: 'qa-authz-accountant' });
  await upsertAdmin({ tenantId: tenant.id, role: readOnlyRole, username: 'qa-authz-readonly' });
  await upsertAdmin({ tenantId: tenant.id, role: noPermissionRole, username: 'qa-authz-denied' });
  await upsertAdmin({ tenantId: tenant.id, role: customRole, username: 'qa-authz-inactive-role' });
  await upsertAdmin({ tenantId: tenant.id, role: customRole, username: 'qa-authz-inactive-user' });
  const mismatchAdmin = await upsertAdmin({ tenantId: tenant.id, role: teacherRole, username: 'qa-authz-mismatch' });

  const allowedLogin = await login(tenant, 'qa-authz-allowed');
  const allowedResult = await runAuthMiddleware({ tenant, token: allowedLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(!allowedResult.error, 'Permission present allows API');

  const teacherDeleteResult = await runAuthMiddleware({ tenant, token: allowedLogin.token, method: 'DELETE', originalUrl: '/api/students/1' });
  assert(teacherDeleteResult.error?.statusCode === 403, 'Teacher cannot use students.delete API');

  const accountantLogin = await login(tenant, 'qa-authz-accountant');
  const accountantFeesResult = await runAuthMiddleware({
    tenant,
    token: accountantLogin.token,
    method: 'GET',
    originalUrl: '/api/finance/student-fees',
  });
  assert(!accountantFeesResult.error, 'Accountant can access fees API');

  const accountantSettingsResult = await runAuthMiddleware({
    tenant,
    token: accountantLogin.token,
    method: 'GET',
    originalUrl: '/api/auth/profile',
  });
  assert(accountantSettingsResult.error?.statusCode === 403, 'Accountant cannot access settings/profile API');

  const readOnlyLogin = await login(tenant, 'qa-authz-readonly');
  const readOnlyViewResult = await runAuthMiddleware({ tenant, token: readOnlyLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(!readOnlyViewResult.error, 'Read Only can use view API');
  const readOnlyWriteResult = await runAuthMiddleware({ tenant, token: readOnlyLogin.token, method: 'POST', originalUrl: '/api/students' });
  assert(readOnlyWriteResult.error?.statusCode === 403, 'Read Only cannot use write API');

  const deniedLogin = await login(tenant, 'qa-authz-denied');
  const deniedResult = await runAuthMiddleware({ tenant, token: deniedLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(deniedResult.error?.statusCode === 403, 'Missing permission returns 403');

  const inactiveUserLogin = await login(tenant, 'qa-authz-inactive-user');
  await prisma.admin.update({
    where: { id: inactiveUserLogin.admin.id },
    data: { status: 'inactive' },
  });
  const inactiveUserResult = await runAuthMiddleware({ tenant, token: inactiveUserLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(inactiveUserResult.error?.statusCode === 403, 'Inactive user returns 403');
  await prisma.admin.update({
    where: { id: inactiveUserLogin.admin.id },
    data: { status: 'active' },
  });

  const inactiveRoleLogin = await login(tenant, 'qa-authz-inactive-role');
  await prisma.role.update({
    where: { id: customRole.id },
    data: { status: 'inactive' },
  });
  const inactiveRoleResult = await runAuthMiddleware({ tenant, token: inactiveRoleLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(inactiveRoleResult.error?.statusCode === 403, 'Inactive role returns 403');
  await prisma.role.update({
    where: { id: customRole.id },
    data: { status: 'active' },
  });

  const mismatchLogin = await login(tenant, 'qa-authz-mismatch');
  await prisma.admin.update({
    where: { id: mismatchAdmin.id },
    data: { roleId: otherTeacherRole.id, role: otherTeacherRole.roleName },
  });
  const mismatchResult = await runAuthMiddleware({ tenant, token: mismatchLogin.token, method: 'GET', originalUrl: '/api/students' });
  assert(mismatchResult.error?.statusCode === 403, 'Cross-tenant role mismatch returns 403');
  await prisma.admin.update({
    where: { id: mismatchAdmin.id },
    data: { roleId: teacherRole.id, role: teacherRole.roleName },
  });

  console.log('\nAuthorization middleware test results');
  console.log('=====================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('Authorization middleware test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
