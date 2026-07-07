import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { rolesService } from '../src/modules/roles/roles.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt17@123';
const TENANT_CODE = 'qa_rbac_audit';
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
    update: { name: 'QA RBAC Audit', subdomain: 'rbac-audit', customDomain: null, status: 'active' },
    create: { tenantCode: TENANT_CODE, name: 'QA RBAC Audit', subdomain: 'rbac-audit', status: 'active' },
  });

  await seedDefaultTenantRoles(prisma, tenant.id);
  return tenant;
};

const getRole = async (tenantId, roleName) => {
  const role = await prisma.role.findFirst({
    where: { tenantId, roleName },
    select: { id: true, roleName: true },
  });

  if (!role) throw new Error(`Missing ${roleName} role`);
  return role;
};

const upsertAdmin = async (tenant) => {
  const role = await getRole(tenant.id, 'admin');
  const password = await bcrypt.hash(PASSWORD, 12);
  const username = 'qa-rbac-audit-admin';
  const admin = await prisma.admin.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username,
      },
    },
    update: {
      name: 'QA RBAC Audit Admin',
      email: 'qa-rbac-audit-admin@example.test',
      password,
      role: role.roleName,
      roleId: role.id,
      status: 'active',
    },
    create: {
      name: 'QA RBAC Audit Admin',
      email: 'qa-rbac-audit-admin@example.test',
      username,
      password,
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
  audit: {
    ipAddress: '127.0.0.17',
    userAgent: 'prompt-17-audit-test',
  },
});

const readAuditLogs = (tenantId) => prisma.$queryRaw`
  SELECT action, module, target_type, target_id, old_value, new_value, ip_address, user_agent
  FROM audit_logs
  WHERE tenant_id = ${tenantId}
    AND user_agent = 'prompt-17-audit-test'
  ORDER BY id ASC
`;

const jsonText = (value) => JSON.stringify(value || {});

const cleanup = async (tenantId) => {
  await prisma.$executeRaw`
    DELETE FROM audit_logs
    WHERE tenant_id = ${tenantId}
      AND user_agent = 'prompt-17-audit-test'
  `;
  await prisma.$executeRaw`
    DELETE FROM admins
    WHERE tenant_id = ${tenantId}
      AND username LIKE 'qa-rbac-audit-user%'
  `;
  await prisma.$executeRaw`
    DELETE FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name LIKE 'qa_audit_%'
      AND is_system_role = false
  `;
};

const run = async () => {
  const tenant = await upsertTenant();
  const admin = await upsertAdmin(tenant);
  const auth = requester(tenant, admin);
  const teacherRole = await getRole(tenant.id, 'teacher');

  await cleanup(tenant.id);

  const role = await rolesService.createRole({
    roleName: 'qa_audit_role',
    description: 'Audit role',
    permissions: ['students.view'],
  }, auth);

  await rolesService.updateRole(role.id, {
    description: 'Audit role updated',
    status: 'active',
  }, auth);

  await rolesService.assignPermissionsToRole(role.id, {
    permissions: ['students.view', 'attendance.mark'],
  }, auth);

  const deleteRole = await rolesService.createRole({
    roleName: 'qa_audit_delete_role',
    permissions: [],
  }, auth);
  await rolesService.deleteRole(deleteRole.id, auth);

  const user = await usersService.createUser({
    name: 'QA RBAC Audit User',
    email: 'qa-rbac-audit-user@example.test',
    username: 'qa-rbac-audit-user',
    password: PASSWORD,
    roleId: role.id,
    status: 'active',
  }, auth);

  await usersService.updateUser(user.id, {
    phone: '03001700000',
    password: 'Prompt17@456',
  }, auth);

  await usersService.assignRole(user.id, { roleId: teacherRole.id }, auth);
  await usersService.deactivateUser(user.id, auth);

  const logs = await readAuditLogs(tenant.id);
  const actions = logs.map((log) => log.action);

  assert(actions.includes('role.created'), 'Role created audit log is written');
  assert(actions.includes('role.updated'), 'Role updated audit log is written');
  assert(actions.includes('role.permissions.updated'), 'Role permissions audit log is written');
  assert(actions.includes('role.deleted'), 'Role deleted audit log is written');
  assert(actions.includes('user.created'), 'User created audit log is written');
  assert(actions.includes('user.updated'), 'User updated audit log is written');
  assert(actions.includes('user.role.changed'), 'User role changed audit log is written');
  assert(actions.includes('user.deactivated'), 'User deactivated audit log is written');
  assert(logs.every((log) => Number(log.target_id) > 0), 'Audit logs include target ids');
  assert(logs.every((log) => log.ip_address === '127.0.0.17'), 'Audit logs include ip address');
  assert(!logs.some((log) => jsonText(log.old_value).includes(PASSWORD) || jsonText(log.new_value).includes(PASSWORD)), 'Audit logs do not store raw password');

  await cleanup(tenant.id);

  console.log('\nRBAC audit log test results');
  console.log('===========================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('RBAC audit log test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
