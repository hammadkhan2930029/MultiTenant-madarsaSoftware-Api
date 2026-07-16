import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { branchesService } from '../src/modules/branches/branches.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { tenantsService } from '../src/modules/tenants/tenants.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt16@123';
const TENANT_CODE = 'qa_branch_edges_jamia1';
const OTHER_TENANT_CODE = 'qa_branch_edges_jamia2';
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

const cleanupTenantData = async (tenantId) => {
  await prisma.$executeRaw`UPDATE tenant SET ownerAdminId = NULL WHERE id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM audit_logs WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM classes WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM branches WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM admins WHERE tenant_id = ${tenantId}`;
};

const upsertTenant = async ({ tenantCode, name, subdomain, branchEnabled = true, branchLimit = 5, status = 'active' }) => {
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode },
    update: { name, subdomain, customDomain: null, status, branchEnabled, branchLimit },
    create: { tenantCode, name, subdomain, status, branchEnabled, branchLimit },
  });

  await cleanupTenantData(tenant.id);
  await seedDefaultTenantRoles(prisma, tenant.id);

  return prisma.tenant.update({
    where: { id: tenant.id },
    data: { status, branchEnabled, branchLimit },
  });
};

const getRole = async (tenantId, roleName) => {
  const role = await prisma.role.findFirst({
    where: { tenantId, roleName },
    select: { id: true, roleName: true },
  });

  if (!role) throw new Error(`Missing role ${roleName}`);
  return role;
};

const upsertTenantAdmin = async (tenant) => {
  const role = await getRole(tenant.id, 'admin');
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const username = `qa-branch-admin-${tenant.tenantCode}`;

  const existingAdmin = await prisma.admin.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { username },
        { email: `${username}@example.test` },
      ],
    },
  });

  const data = {
    name: `${tenant.name} Admin`,
    email: `${username}@example.test`,
    username,
    password: hashedPassword,
    role: role.roleName,
    roleId: role.id,
    tenantId: tenant.id,
    branchId: null,
    status: 'active',
  };

  const admin = existingAdmin
    ? await prisma.admin.update({ where: { id: existingAdmin.id }, data })
    : await prisma.admin.create({ data });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerAdminId: admin.id },
  });

  return admin;
};

const tenantAdminRequester = (tenant, admin) => ({
  tenantId: tenant.id,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin,
});

const createBranch = (tenant, admin, payload) =>
  branchesService.createBranch(tenant.id, payload, admin);

const login = (tenant, username) => authService.loginAdmin(
  { identity: username, password: PASSWORD },
  { tenantId: tenant.id, isSystemHost: false },
);

const runAuthMiddleware = async ({ tenant, token, method = 'GET', query = {}, body = {} }) => {
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method,
    originalUrl: '/api/students',
    query,
    body,
    tenantId: tenant.id,
    tenant: { id: tenant.id, status: tenant.status },
    tenantHost: { isSystemHost: false },
    ip: '127.0.0.1',
  };

  const error = await new Promise((resolve) => {
    authMiddleware(req, {}, (nextError) => resolve(nextError || null));
  });

  return { req, error };
};

const run = async () => {
  const tenant = await upsertTenant({
    tenantCode: TENANT_CODE,
    name: 'QA Branch Edges Jamia 1',
    subdomain: 'branch-edges-jamia1',
    branchEnabled: true,
    branchLimit: 5,
  });
  const otherTenant = await upsertTenant({
    tenantCode: OTHER_TENANT_CODE,
    name: 'QA Branch Edges Jamia 2',
    subdomain: 'branch-edges-jamia2',
    branchEnabled: true,
    branchLimit: 5,
  });
  const admin = await upsertTenantAdmin(tenant);
  const otherAdmin = await upsertTenantAdmin(otherTenant);
  const requester = tenantAdminRequester(tenant, admin);

  await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: false, branchLimit: 1 });
  let disabledManagementBlocked = false;
  try {
    await branchesService.getBranches(tenant.id, {});
  } catch (error) {
    disabledManagementBlocked = error?.statusCode === 403;
  }
  assert(disabledManagementBlocked, 'Disabled branch system blocks tenant branch management');

  const enabledSummary = await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: true, branchLimit: 2 });
  assert(enabledSummary.branchEnabled === true && enabledSummary.branchLimit === 2, 'Branch system can be enabled with a valid limit');

  const branchA = await createBranch(tenant, admin, {
    name: 'QA Main Branch',
    code: 'QA-BR-001',
    address: 'Lahore',
    contact: '03000000001',
  });
  const branchB = await createBranch(tenant, admin, {
    name: 'QA Second Branch',
    code: 'QA-BR-002',
    address: 'Lahore',
    contact: '03000000002',
  });

  let lowerLimitBlocked = false;
  try {
    await tenantsService.updateTenantBranchLimit(tenant.id, { branchLimit: 1 });
  } catch (error) {
    lowerLimitBlocked = error?.statusCode === 400;
  }
  assert(lowerLimitBlocked, 'Branch limit lower than created branches is blocked without deleting data');

  const increasedLimit = await tenantsService.updateTenantBranchLimit(tenant.id, { branchLimit: 3 });
  assert(increasedLimit.branchLimit === 3, 'Branch limit increase works');

  let sameTenantCodeBlocked = false;
  try {
    await createBranch(tenant, admin, {
      name: 'QA Duplicate Code Branch',
      code: branchA.code,
      address: 'Lahore',
    });
  } catch (error) {
    sameTenantCodeBlocked = error?.statusCode === 409;
  }
  assert(sameTenantCodeBlocked, 'Duplicate branch code within same tenant is blocked');

  await tenantsService.updateTenantBranchLimit(tenant.id, { branchLimit: 2 });
  let overLimitCreateBlocked = false;
  try {
    await createBranch(tenant, admin, {
      name: 'QA Over Limit Branch',
      code: 'QA-BR-003',
      address: 'Lahore',
    });
  } catch (error) {
    overLimitCreateBlocked = error?.statusCode === 400;
  }
  assert(overLimitCreateBlocked, 'Over-limit state blocks new branch creation');

  const otherBranchSameCode = await createBranch(otherTenant, otherAdmin, {
    name: 'QA Other Tenant Same Code',
    code: branchA.code,
    address: 'Karachi',
  });
  assert(otherBranchSameCode.code === branchA.code, 'Same branch code is allowed in different tenants');

  await tenantsService.updateTenantBranchLimit(tenant.id, { branchLimit: 3 });
  const concurrentPayloads = [
    { name: 'QA Concurrent One', code: 'QA-BR-004', address: 'Lahore' },
    { name: 'QA Concurrent Two', code: 'QA-BR-005', address: 'Lahore' },
  ];
  const concurrentResults = await Promise.allSettled(concurrentPayloads.map((payload) => createBranch(tenant, admin, payload)));
  const concurrentSuccesses = concurrentResults.filter((result) => result.status === 'fulfilled').length;
  const concurrentFailures = concurrentResults.filter((result) => result.status === 'rejected' && result.reason?.statusCode === 400).length;
  assert(concurrentSuccesses === 1 && concurrentFailures === 1, 'Concurrent branch creation cannot bypass branch limit');

  const teacherRole = await getRole(tenant.id, 'teacher');
  const branchUser = await usersService.createUser({
    name: 'QA Branch User',
    email: 'qa-branch-user@example.test',
    username: 'qa-branch-user',
    password: PASSWORD,
    roleId: teacherRole.id,
    branchId: branchA.id,
    status: 'active',
  }, requester);
  assert(branchUser.branchId === branchA.id, 'Branch user can be assigned to active tenant branch');

  const reassignedUser = await usersService.updateUser(branchUser.id, { branchId: branchB.id }, requester);
  assert(reassignedUser.branchId === branchB.id, 'User branch change validates tenant branch and updates assignment');

  let crossTenantBranchRejected = false;
  try {
    await usersService.updateUser(branchUser.id, { branchId: otherBranchSameCode.id }, requester);
  } catch (error) {
    crossTenantBranchRejected = error?.statusCode === 403;
  }
  assert(crossTenantBranchRejected, 'User branch change rejects another tenant branch');

  await prisma.branch.update({ where: { id: branchB.id }, data: { status: 'inactive' } });
  let inactiveBranchLoginBlocked = false;
  try {
    await login(tenant, 'qa-branch-user');
  } catch (error) {
    inactiveBranchLoginBlocked = error?.statusCode === 403;
  }
  assert(inactiveBranchLoginBlocked, 'Branch user assigned to inactive branch is denied login');
  await prisma.branch.update({ where: { id: branchB.id }, data: { status: 'active' } });

  const branchLogin = await login(tenant, 'qa-branch-user');
  const injectedBranchResult = await runAuthMiddleware({
    tenant: { ...tenant, status: 'active' },
    token: branchLogin.token,
    method: 'GET',
    query: { branchId: String(branchA.id) },
  });
  assert(injectedBranchResult.error?.statusCode === 403, 'Unauthorized branchId injection is denied');

  await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: false, branchLimit: 3 });
  let disabledBranchUserBlocked = false;
  try {
    await login(tenant, 'qa-branch-user');
  } catch (error) {
    disabledBranchUserBlocked = error?.statusCode === 403;
  }
  assert(disabledBranchUserBlocked, 'Branch user access is denied when branch system is disabled');

  const disabledBranchesCount = await prisma.branch.count({ where: { tenantId: tenant.id } });
  assert(disabledBranchesCount >= 3, 'Disabling branch system does not delete branch data');

  await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: true, branchLimit: 5 });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'inactive' } });
  let inactiveTenantLoginBlocked = false;
  try {
    await login({ ...tenant, status: 'inactive' }, admin.username);
  } catch (error) {
    inactiveTenantLoginBlocked = error?.statusCode === 403;
  } finally {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'active' } });
  }
  assert(inactiveTenantLoginBlocked, 'Inactive tenant login is blocked');

  const linkedClass = await prisma.academicClass.create({
    data: {
      tenantId: tenant.id,
      branchId: branchA.id,
      name: 'QA Linked Class',
      status: 'active',
    },
  });

  let linkedDeleteBlocked = false;
  try {
    await branchesService.deleteBranch(tenant.id, branchA.id);
  } catch (error) {
    linkedDeleteBlocked = error?.statusCode === 400;
  } finally {
    await prisma.academicClass.delete({ where: { id: linkedClass.id } });
  }
  assert(linkedDeleteBlocked, 'Branch delete attempt with linked records is blocked');

  console.log('\nBranch edge case test results');
  console.log('=============================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('Branch edge case test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
