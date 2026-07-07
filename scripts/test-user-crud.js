import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt12@123';
const SHARED_EMAIL = 'qa-user-shared@example.test';

const TENANTS = [
  { tenantCode: 'qa_users_jamia1', name: 'QA Users Jamia 1', subdomain: 'users-jamia1' },
  { tenantCode: 'qa_users_jamia2', name: 'QA Users Jamia 2', subdomain: 'users-jamia2' },
];

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

  if (!role) throw new Error(`Missing ${roleName} role for tenant ${tenantId}`);
  return role;
};

const upsertTenantAdmin = async (tenant) => {
  const role = await getRole(tenant.id, 'admin');
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const username = `qa-users-admin-${tenant.tenantCode}`;

  const admin = await prisma.admin.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username,
      },
    },
    update: {
      name: `${tenant.name} Admin`,
      email: `admin-${tenant.tenantCode}@example.test`,
      phone: '03000000000',
      password: hashedPassword,
      role: role.roleName,
      roleId: role.id,
      status: 'active',
    },
    create: {
      name: `${tenant.name} Admin`,
      email: `admin-${tenant.tenantCode}@example.test`,
      phone: '03000000000',
      username,
      password: hashedPassword,
      role: role.roleName,
      roleId: role.id,
      tenantId: tenant.id,
      status: 'active',
    },
  });

  return admin;
};

const requester = (tenant, admin) => ({
  tenantId: tenant.id,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin,
});

const cleanupUsers = async (tenantId) => {
  await prisma.$executeRaw`
    DELETE FROM admins
    WHERE tenant_id = ${tenantId}
      AND email = ${SHARED_EMAIL}
  `;
};

const run = async () => {
  const jamia1 = await upsertTenant(TENANTS[0]);
  const jamia2 = await upsertTenant(TENANTS[1]);
  const admin1 = await upsertTenantAdmin(jamia1);
  const admin2 = await upsertTenantAdmin(jamia2);
  const auth1 = requester(jamia1, admin1);
  const auth2 = requester(jamia2, admin2);
  const teacher1 = await getRole(jamia1.id, 'teacher');
  const teacher2 = await getRole(jamia2.id, 'teacher');
  const accountant1 = await getRole(jamia1.id, 'accountant');

  await cleanupUsers(jamia1.id);
  await cleanupUsers(jamia2.id);

  const jamia1User = await usersService.createUser({
    tenantId: jamia2.id,
    name: 'QA Shared User',
    email: SHARED_EMAIL,
    phone: '03111111111',
    password: PASSWORD,
    roleId: teacher1.id,
    status: 'active',
  }, auth1);

  assert(jamia1User.tenantId === jamia1.id, 'Create ignores frontend tenantId and uses current tenant');
  assert(jamia1User.phone === '03111111111', 'Phone field is saved and returned');

  const jamia2User = await usersService.createUser({
    name: 'QA Shared User',
    email: SHARED_EMAIL,
    phone: '03222222222',
    password: PASSWORD,
    roleId: teacher2.id,
    status: 'active',
  }, auth2);

  assert(jamia2User.tenantId === jamia2.id, 'Same email is allowed in different tenants');

  let duplicateBlocked = false;
  try {
    await usersService.createUser({
      name: 'Duplicate User',
      email: SHARED_EMAIL,
      password: PASSWORD,
      roleId: teacher1.id,
    }, auth1);
  } catch (error) {
    duplicateBlocked = error?.statusCode === 409;
  }
  assert(duplicateBlocked, 'Same tenant duplicate email is blocked');

  let crossRoleBlocked = false;
  try {
    await usersService.createUser({
      name: 'Cross Role User',
      email: 'qa-cross-role@example.test',
      password: PASSWORD,
      roleId: teacher1.id,
    }, auth2);
  } catch (error) {
    crossRoleBlocked = error?.statusCode === 400;
  }
  assert(crossRoleBlocked, 'Jamia1 role cannot be assigned to Jamia2 user');

  const jamia1List = await usersService.getUsers({ search: SHARED_EMAIL, page: 1, limit: 20 }, auth1);
  const jamia2List = await usersService.getUsers({ search: SHARED_EMAIL, page: 1, limit: 20 }, auth2);
  assert(jamia1List.items.every((user) => user.tenantId === jamia1.id), 'Jamia1 user list contains only Jamia1 users');
  assert(jamia2List.items.every((user) => user.tenantId === jamia2.id), 'Jamia2 user list contains only Jamia2 users');

  let crossGetBlocked = false;
  try {
    await usersService.getUserById(jamia2User.id, auth1);
  } catch (error) {
    crossGetBlocked = error?.statusCode === 404;
  }
  assert(crossGetBlocked, 'Jamia1 cannot fetch Jamia2 user by id');

  const updatedUser = await usersService.updateUser(jamia1User.id, { phone: '03333333333', status: 'active' }, auth1);
  assert(updatedUser.phone === '03333333333', 'Same tenant user update works');

  const roleUpdatedUser = await usersService.assignRole(jamia1User.id, { roleId: accountant1.id }, auth1);
  assert(roleUpdatedUser.roleId === accountant1.id, 'Separate role assignment updates user role');
  assert(roleUpdatedUser.permissionKeys.length > 0, 'Updated role permissions are returned for refresh/next login');

  let crossTenantRoleAssignBlocked = false;
  try {
    await usersService.assignRole(jamia1User.id, { roleId: teacher2.id }, auth1);
  } catch (error) {
    crossTenantRoleAssignBlocked = error?.statusCode === 400;
  }
  assert(crossTenantRoleAssignBlocked, 'Jamia1 user cannot be assigned Jamia2 role');

  let invalidRoleRejected = false;
  try {
    await usersService.assignRole(jamia1User.id, { roleId: 99999999 }, auth1);
  } catch (error) {
    invalidRoleRejected = error?.statusCode === 400;
  }
  assert(invalidRoleRejected, 'Invalid roleId is rejected');

  await prisma.role.update({
    where: { id: accountant1.id },
    data: { status: 'inactive' },
  });

  let inactiveRoleRejected = false;
  try {
    await usersService.assignRole(jamia1User.id, { roleId: accountant1.id }, auth1);
  } catch (error) {
    inactiveRoleRejected = error?.statusCode === 400;
  } finally {
    await prisma.role.update({
      where: { id: accountant1.id },
      data: { status: 'active' },
    });
  }
  assert(inactiveRoleRejected, 'Inactive role cannot be assigned');

  let selfRoleChangeBlocked = false;
  try {
    await usersService.assignRole(admin1.id, { roleId: teacher1.id }, auth1);
  } catch (error) {
    selfRoleChangeBlocked = error?.statusCode === 400;
  }
  assert(selfRoleChangeBlocked, 'Tenant admin cannot change own role');

  const deactivatedUser = await usersService.deactivateUser(jamia1User.id, auth1);
  assert(deactivatedUser.status === 'inactive', 'DELETE/deactivate marks user inactive');

  let selfDeactivateBlocked = false;
  try {
    await usersService.updateUser(admin1.id, { status: 'inactive' }, auth1);
  } catch (error) {
    selfDeactivateBlocked = error?.statusCode === 400;
  }
  assert(selfDeactivateBlocked, 'Tenant admin cannot deactivate own account');

  await cleanupUsers(jamia1.id);
  await cleanupUsers(jamia2.id);

  console.log('\nUser CRUD tenant isolation test results');
  console.log('======================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('User CRUD tenant isolation test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
