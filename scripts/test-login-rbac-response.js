import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';

const PASSWORD = 'Prompt16@123';
const TENANT_CODE = 'qa_login_rbac';
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

const upsertTenant = async () => {
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: TENANT_CODE },
    update: { name: 'QA Login RBAC', subdomain: 'login-rbac', customDomain: null, status: 'active' },
    create: { tenantCode: TENANT_CODE, name: 'QA Login RBAC', subdomain: 'login-rbac', status: 'active' },
  });

  await seedDefaultTenantRoles(prisma, tenant.id);
  return tenant;
};

const getRole = async (tenantId, roleName) => {
  const role = await prisma.role.findFirst({
    where: { tenantId, roleName },
    select: { id: true, tenantId: true, roleName: true, status: true },
  });

  if (!role) throw new Error(`Missing ${roleName} role`);
  return role;
};

const upsertAdmin = async ({ tenantId, role, username, status = 'active' }) => {
  const password = await bcrypt.hash(PASSWORD, 12);
  const email = `${username}@example.test`;
  const existing = await prisma.admin.findFirst({ where: { tenantId, username } });
  const data = {
    name: username,
    email,
    username,
    password,
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

const permissionKeys = (loginResult) => loginResult.user.permissions || [];

const run = async () => {
  const tenant = await upsertTenant();
  const teacherRole = await getRole(tenant.id, 'teacher');
  const accountantRole = await getRole(tenant.id, 'accountant');

  const teacherAdmin = await upsertAdmin({ tenantId: tenant.id, role: teacherRole, username: 'qa-login-teacher' });
  await upsertAdmin({ tenantId: tenant.id, role: accountantRole, username: 'qa-login-accountant' });
  await upsertAdmin({ tenantId: tenant.id, role: teacherRole, username: 'qa-login-inactive-user', status: 'inactive' });
  await upsertAdmin({ tenantId: tenant.id, role: teacherRole, username: 'qa-login-inactive-role' });

  const teacherLogin = await login(tenant, 'qa-login-teacher');
  assert(Boolean(teacherLogin.token), 'Login response includes token');
  assert(teacherLogin.user.id === teacherAdmin.id, 'Login response includes user id');
  assert(teacherLogin.user.tenantId === tenant.id, 'Login response includes tenantId');
  assert(teacherLogin.user.role?.id === teacherRole.id, 'Login response includes role object');
  assert(!Object.prototype.hasOwnProperty.call(teacherLogin.user, 'password'), 'Login response excludes sensitive password');
  assert(permissionKeys(teacherLogin).includes('students.view'), 'Teacher login includes students.view');
  assert(permissionKeys(teacherLogin).includes('attendance.mark'), 'Teacher login includes attendance.mark');
  assert(!permissionKeys(teacherLogin).includes('students.delete'), 'Teacher login does not include students.delete');

  const accountantLogin = await login(tenant, 'qa-login-accountant');
  assert(permissionKeys(accountantLogin).includes('fees.view'), 'Accountant login includes fees.view');
  assert(permissionKeys(accountantLogin).includes('reports.view'), 'Accountant login includes reports.view');
  assert(!permissionKeys(accountantLogin).includes('settings.update'), 'Accountant login does not include settings.update');

  await prisma.admin.update({
    where: { id: teacherAdmin.id },
    data: { roleId: accountantRole.id, role: accountantRole.roleName },
  });
  const changedRoleLogin = await login(tenant, 'qa-login-teacher');
  assert(changedRoleLogin.user.role?.id === accountantRole.id, 'Role change is reflected on next login');
  assert(permissionKeys(changedRoleLogin).includes('fees.view'), 'Next login returns updated role permissions');
  assert(!permissionKeys(changedRoleLogin).includes('attendance.mark'), 'Next login removes old role permissions');

  let inactiveUserBlocked = false;
  try {
    await login(tenant, 'qa-login-inactive-user');
  } catch (error) {
    inactiveUserBlocked = error?.statusCode === 403;
  }
  assert(inactiveUserBlocked, 'Inactive user login is blocked');

  await prisma.role.update({ where: { id: teacherRole.id }, data: { status: 'inactive' } });
  let inactiveRoleBlocked = false;
  try {
    await login(tenant, 'qa-login-inactive-role');
  } catch (error) {
    inactiveRoleBlocked = error?.statusCode === 403;
  } finally {
    await prisma.role.update({ where: { id: teacherRole.id }, data: { status: 'active' } });
  }
  assert(inactiveRoleBlocked, 'Inactive role login is blocked');

  console.log('\nLogin RBAC response test results');
  console.log('================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('Login RBAC response test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
