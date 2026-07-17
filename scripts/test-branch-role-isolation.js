import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { branchesService } from '../src/modules/branches/branches.service.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { rolesService } from '../src/modules/roles/roles.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt17@123';
const TENANT_CODE = 'qa_branch_role_isolation';
const results = [];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const frontendRoot = path.join(workspaceRoot, 'multiTenant-madarsaSoftware');

const pass = (name, details = '') => results.push({ status: 'PASS', name, details });
const fail = (name, details = '') => {
  results.push({ status: 'FAIL', name, details });
  throw new Error(`${name}${details ? `: ${details}` : ''}`);
};
const assert = (condition, name, details = '') => {
  if (!condition) fail(name, details);
  pass(name, details);
};

const expectDenied = async (name, fn, allowedStatuses = [403, 404, 400]) => {
  try {
    await fn();
  } catch (error) {
    if (allowedStatuses.includes(error?.statusCode)) {
      pass(name, `status ${error.statusCode}`);
      return;
    }
    fail(name, `unexpected status ${error?.statusCode || 'unknown'}: ${error.message}`);
  }
  fail(name, 'request was allowed');
};

const cleanupTenantData = async (tenantId) => {
  await prisma.$executeRaw`UPDATE tenant SET ownerAdminId = NULL WHERE id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM audit_logs WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM admins WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM role_permissions WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM roles WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM branches WHERE tenant_id = ${tenantId}`;
};

const upsertTenant = async () => {
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode: TENANT_CODE },
    update: {
      name: 'QA Branch Role Isolation',
      subdomain: 'qa-branch-role-isolation',
      customDomain: null,
      status: 'active',
      branchEnabled: true,
      branchLimit: 10,
    },
    create: {
      tenantCode: TENANT_CODE,
      name: 'QA Branch Role Isolation',
      subdomain: 'qa-branch-role-isolation',
      status: 'active',
      branchEnabled: true,
      branchLimit: 10,
    },
  });

  await cleanupTenantData(tenant.id);
  await seedDefaultTenantRoles(prisma, tenant.id);

  return prisma.tenant.update({
    where: { id: tenant.id },
    data: { branchEnabled: true, branchLimit: 10, status: 'active' },
  });
};

const getRole = async (tenantId, roleName, branchId = null) => {
  const rows = await prisma.$queryRaw`
    SELECT id, tenant_id, branch_id, role_scope_key, role_name, status, is_system_role
    FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name = ${roleName}
      AND branch_id <=> ${branchId}
    LIMIT 1
  `;
  if (!rows[0]) throw new Error(`Missing role ${roleName}`);
  return {
    id: Number(rows[0].id),
    tenantId: Number(rows[0].tenant_id),
    branchId: rows[0].branch_id === null || rows[0].branch_id === undefined ? null : Number(rows[0].branch_id),
    roleScopeKey: Number(rows[0].role_scope_key || 0),
    roleName: rows[0].role_name,
    status: rows[0].status,
    isSystemRole: Boolean(rows[0].is_system_role),
  };
};

const createAdmin = async ({ tenant, role, username, branchId = null, status = 'active' }) => {
  const password = await bcrypt.hash(PASSWORD, 12);
  return prisma.admin.create({
    data: {
      name: username,
      email: `${username}@example.test`,
      username,
      password,
      role: role.roleName,
      roleId: role.id,
      tenantId: tenant.id,
      branchId,
      status,
    },
  });
};

const login = (tenant, username) => authService.loginAdmin(
  { identity: username, password: PASSWORD },
  { tenantId: tenant.id, isSystemHost: false },
);

const tenantRequester = (tenant, admin) => ({
  tenantId: tenant.id,
  branchId: null,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin,
  permissionKeys: [],
  audit: {
    ipAddress: '127.0.0.17',
    userAgent: 'prompt-17-branch-role-isolation',
  },
});

const branchRequester = (tenant, admin, loginResult) => ({
  tenantId: tenant.id,
  branchId: admin.branchId,
  isTenantAdmin: false,
  isSuperAdmin: false,
  role: loginResult.role,
  admin,
  permissionKeys: loginResult.permissions || [],
  audit: {
    ipAddress: '127.0.0.17',
    userAgent: 'prompt-17-branch-role-isolation',
  },
});

const visibleIds = (result) => new Set((result.items || []).map((item) => Number(item.id)));

const runStaticUiChecks = () => {
  const userManagementPath = path.join(frontendRoot, 'src', 'Pages', 'RoleManagement', 'UserManagement.jsx');
  const roleManagementPath = path.join(frontendRoot, 'src', 'Pages', 'RoleManagement', 'RoleManagement.jsx');
  const routeGuardPath = path.join(frontendRoot, 'src', 'Components', 'Auth', 'RoutePermissionGuard.jsx');
  const sidebarPath = path.join(frontendRoot, 'src', 'Components', 'SideBar', 'sidebar.jsx');

  const userManagement = fs.readFileSync(userManagementPath, 'utf8');
  const roleManagement = fs.readFileSync(roleManagementPath, 'utf8');
  const routeGuard = fs.readFileSync(routeGuardPath, 'utf8');
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');

  assert(userManagement.includes('branchScopedSession ? (') && userManagement.includes('getBranches') && userManagement.includes('!branchScopedSession'),
    'UI: Branch dropdown Branch Admin form mein hidden hai');
  assert(userManagement.includes('role.branchId') && userManagement.includes('sessionBranchId'),
    'UI: Role dropdown only own branch roles show karta hai');
  assert(userManagement.includes('!branchScopedSession') && userManagement.includes('user-branch-readonly') && userManagement.includes('user-branch'),
    'UI: Tenant Admin form branch dropdown behavior preserved with Branch Admin readonly branch');
  assert(roleManagement.includes('branchScopedSession') && roleManagement.includes('filterPermissionModulesForBranch') && roleManagement.includes('availablePermissionKeys'),
    'UI: Branch role permission matrix own permission boundary use karti hai');
  assert(routeGuard.includes('branchScopedBlockedRoute') && sidebar.includes('isBranchScopedSession') && sidebar.includes('branch_management') && sidebar.includes('tenant_management'),
    'UI: Direct unauthorized route/sidebar tenant-branch management denied');
  assert(!userManagement.includes('font-family') && !roleManagement.includes('font-family'),
    'UI: Existing Urdu font/theme unchanged; no role UI font override added');
};

const run = async () => {
  const tenant = await upsertTenant();
  const tenantAdminRole = await getRole(tenant.id, 'admin');
  const teacherTenantRole = await getRole(tenant.id, 'teacher');
  const tenantAdmin = await createAdmin({ tenant, role: tenantAdminRole, username: 'qa-p17-tenant-admin' });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ownerAdminId: tenantAdmin.id } });

  const tenantAuth = tenantRequester(tenant, tenantAdmin);
  const branchA = await branchesService.createBranch(tenant.id, { name: 'P17 Branch A', code: 'P17-A' }, tenantAdmin);
  const branchB = await branchesService.createBranch(tenant.id, { name: 'P17 Branch B', code: 'P17-B' }, tenantAdmin);

  const tenantLevelRole = await rolesService.createRole({
    roleName: 'p17_tenant_operator',
    permissions: ['students.view'],
  }, tenantAuth);
  const branchAdminRole = await rolesService.createRole({
    roleName: 'p17_branch_admin',
    branchId: branchA.id,
    permissions: ['roles.view', 'roles.manage', 'users.view', 'users.manage', 'students.view'],
  }, tenantAuth);
  const branchBRole = await rolesService.createRole({
    roleName: 'p17_branch_b_role',
    branchId: branchB.id,
    permissions: ['roles.view', 'users.view', 'students.view'],
  }, tenantAuth);

  const branchAdminUser = await usersService.createUser({
    name: 'P17 Branch Admin',
    email: 'p17-branch-admin@example.test',
    username: 'p17-branch-admin',
    password: PASSWORD,
    roleId: branchAdminRole.id,
    branchId: branchA.id,
    status: 'active',
  }, tenantAuth);
  const branchBUser = await usersService.createUser({
    name: 'P17 Branch B User',
    email: 'p17-branch-b-user@example.test',
    username: 'p17-branch-b-user',
    password: PASSWORD,
    roleId: branchBRole.id,
    branchId: branchB.id,
    status: 'active',
  }, tenantAuth);

  const branchLogin = await login(tenant, branchAdminUser.username);
  const branchAuth = branchRequester(tenant, {
    ...branchAdminUser,
    branchId: branchA.id,
    roleId: branchAdminRole.id,
  }, branchLogin);

  const branchRoles = await rolesService.getRoles({ page: 1, limit: 100 }, branchAuth);
  const branchRoleIds = visibleIds(branchRoles);
  assert(!branchRoleIds.has(Number(tenantAdminRole.id)) && !branchRoleIds.has(Number(tenantLevelRole.id)),
    'Role: Branch Admin ko Tenant Admin/tenant roles show nahi hote');
  assert(!branchRoleIds.has(Number(branchBRole.id)), 'Role: Branch Admin ko doosri branch roles show nahi hote');
  assert(branchRoleIds.has(Number(branchAdminRole.id)), 'Role: Branch Admin own branch roles dekh sakta hai');

  const createdOwnRole = await rolesService.createRole({
    roleName: 'p17_branch_created_role',
    permissions: ['students.view'],
  }, branchAuth);
  assert(createdOwnRole.branchId === branchA.id && createdOwnRole.roleScopeKey === branchA.id,
    'Role: Branch Admin sirf own branch roles create karta hai');

  await expectDenied('Role: Branch Admin request body branchId override nahi kar sakta', () => rolesService.createRole({
    roleName: 'p17_wrong_branch_role',
    branchId: branchB.id,
    permissions: ['students.view'],
  }, branchAuth));
  await expectDenied('Role: Branch Admin tenant-level role create nahi kar sakta', () => rolesService.createRole({
    roleName: 'p17_tenant_level_attempt',
    branchId: null,
    permissions: ['students.view'],
  }, branchAuth));
  await expectDenied('Role: Branch Admin higher permissions assign nahi kar sakta', () => rolesService.createRole({
    roleName: 'p17_high_permission_attempt',
    permissions: ['students.view', 'branches.manage'],
  }, branchAuth));
  await expectDenied('Role: Branch Admin doosri branch role detail access nahi kar sakta', () => rolesService.getRoleById(branchBRole.id, branchAuth));
  await expectDenied('Role: Branch Admin doosri branch role update nahi kar sakta', () => rolesService.updateRole(branchBRole.id, { description: 'tamper' }, branchAuth));
  await expectDenied('Role: Branch Admin doosri branch role delete nahi kar sakta', () => rolesService.deleteRole(branchBRole.id, branchAuth));

  const branchUsers = await usersService.getUsers({ page: 1, limit: 100 }, branchAuth);
  const branchUserIds = visibleIds(branchUsers);
  assert(branchUserIds.has(Number(branchAdminUser.id)), 'User: Branch Admin ko own branch users show hote hain');
  assert(!branchUserIds.has(Number(tenantAdmin.id)), 'User: Tenant Admin users show nahi hote');
  assert(!branchUserIds.has(Number(branchBUser.id)), 'User: Doosri branch users show nahi hote');

  const branchCreatedUser = await usersService.createUser({
    name: 'P17 Branch Created User',
    email: 'p17-created-user@example.test',
    username: 'p17-created-user',
    password: PASSWORD,
    roleId: createdOwnRole.id,
    status: 'active',
  }, branchAuth);
  assert(branchCreatedUser.branchId === branchA.id, 'User: New user automatically current branch mein create hota hai');

  await expectDenied('User: Branch Admin branchId manipulate nahi kar sakta', () => usersService.createUser({
    name: 'P17 Manipulated Branch User',
    email: 'p17-manipulated-branch@example.test',
    username: 'p17-manipulated-branch',
    password: PASSWORD,
    roleId: createdOwnRole.id,
    branchId: branchB.id,
    status: 'active',
  }, branchAuth));
  await expectDenied('User: Branch Admin Tenant Admin role assign nahi kar sakta', () => usersService.createUser({
    name: 'P17 Tenant Role Attempt',
    email: 'p17-tenant-role-attempt@example.test',
    username: 'p17-tenant-role-attempt',
    password: PASSWORD,
    roleId: tenantAdminRole.id,
    status: 'active',
  }, branchAuth));
  await expectDenied('User: Branch Admin doosri branch role assign nahi kar sakta', () => usersService.createUser({
    name: 'P17 Other Branch Role Attempt',
    email: 'p17-other-branch-role@example.test',
    username: 'p17-other-branch-role',
    password: PASSWORD,
    roleId: branchBRole.id,
    status: 'active',
  }, branchAuth));
  await expectDenied('User: update se branch change nahi hoti', () => usersService.updateUser(branchCreatedUser.id, { branchId: branchB.id }, branchAuth));

  const reloadedUser = await usersService.getUserById(branchCreatedUser.id, branchAuth);
  assert(reloadedUser.branchId === branchA.id, 'User: denied branch update ke baad branch unchanged hai');

  const tenantRoles = await rolesService.getRoles({ page: 1, limit: 100, branchId: branchA.id }, tenantAuth);
  assert(visibleIds(tenantRoles).has(Number(branchAdminRole.id)), 'Tenant Admin form/list branch role access still works');
  const tenantCreatedUser = await usersService.createUser({
    name: 'P17 Tenant Created Branch User',
    email: 'p17-tenant-created-branch-user@example.test',
    username: 'p17-tenant-created-branch-user',
    password: PASSWORD,
    roleId: branchAdminRole.id,
    branchId: branchA.id,
    status: 'active',
  }, tenantAuth);
  assert(tenantCreatedUser.branchId === branchA.id, 'Tenant Admin user form branch assignment still works');

  runStaticUiChecks();

  console.log('\nBranch role/user isolation test results');
  console.log('=======================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
  console.log('Manual UI note: Browser pixel/theme regression still needs visual review; static checks and frontend build cover code-level regressions.');
};

run()
  .catch((error) => {
    console.error('Branch role/user isolation suite failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
