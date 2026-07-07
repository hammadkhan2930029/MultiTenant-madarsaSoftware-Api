import { prisma } from '../src/config/prisma.js';
import { rolesService } from '../src/modules/roles/roles.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';

const TENANTS = [
  {
    tenantCode: 'qa_roles_jamia1',
    name: 'QA Roles Jamia 1',
    subdomain: 'roles-jamia1',
  },
  {
    tenantCode: 'qa_roles_jamia2',
    name: 'QA Roles Jamia 2',
    subdomain: 'roles-jamia2',
  },
];

const ROLE_NAME = 'QA Shared Role';
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

const upsertTenant = async ({ tenantCode, name, subdomain }) => {
  const tenant = await prisma.tenant.upsert({
    where: { tenantCode },
    update: {
      name,
      subdomain,
      customDomain: null,
      status: 'active',
    },
    create: {
      tenantCode,
      name,
      subdomain,
      status: 'active',
    },
  });

  await seedDefaultTenantRoles(prisma, tenant.id);
  return tenant;
};

const requesterForTenant = (tenant) => ({
  tenantId: tenant.id,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin: { id: null },
});

const cleanupRole = async (tenantId, roleName) => {
  const roles = await prisma.$queryRaw`
    SELECT id
    FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name = ${roleName}
      AND is_system_role = false
  `;

  for (const role of roles) {
    await prisma.$executeRaw`
      DELETE FROM roles
      WHERE id = ${Number(role.id)}
        AND tenant_id = ${tenantId}
        AND is_system_role = false
    `;
  }
};

const run = async () => {
  const setup = [];

  for (const tenantSeed of TENANTS) {
    setup.push(await upsertTenant(tenantSeed));
  }

  const jamia1 = setup[0];
  const jamia2 = setup[1];
  const jamia1Auth = requesterForTenant(jamia1);
  const jamia2Auth = requesterForTenant(jamia2);

  await cleanupRole(jamia1.id, ROLE_NAME);
  await cleanupRole(jamia2.id, ROLE_NAME);

  const jamia1Role = await rolesService.createRole(
    {
      tenantId: jamia2.id,
      roleName: ROLE_NAME,
      description: 'Created by Jamia1 with malicious tenantId in payload.',
      permissionKeys: ['students.view'],
    },
    jamia1Auth,
  );

  assert(jamia1Role.tenantId === jamia1.id, 'Create ignores frontend tenantId and uses current tenant');

  let duplicateBlocked = false;
  try {
    await rolesService.createRole({ roleName: ROLE_NAME }, jamia1Auth);
  } catch (error) {
    duplicateBlocked = error?.statusCode === 409;
  }
  assert(duplicateBlocked, 'Duplicate role name is blocked in same tenant');

  const jamia2Role = await rolesService.createRole({ roleName: ROLE_NAME }, jamia2Auth);
  assert(jamia2Role.tenantId === jamia2.id, 'Same role name is allowed in different tenant');

  const jamia1Roles = await rolesService.getRoles({ page: 1, limit: 100, search: ROLE_NAME }, jamia1Auth);
  const jamia2Roles = await rolesService.getRoles({ page: 1, limit: 100, search: ROLE_NAME }, jamia2Auth);
  assert(jamia1Roles.items.every((role) => role.tenantId === jamia1.id), 'Jamia1 role list contains only Jamia1 roles');
  assert(jamia2Roles.items.every((role) => role.tenantId === jamia2.id), 'Jamia2 role list contains only Jamia2 roles');

  let crossTenantUpdateBlocked = false;
  try {
    await rolesService.updateRole(jamia2Role.id, { description: 'Cross tenant update attempt' }, jamia1Auth);
  } catch (error) {
    crossTenantUpdateBlocked = error?.statusCode === 404;
  }
  assert(crossTenantUpdateBlocked, 'Jamia1 cannot update Jamia2 role');

  let crossTenantDeleteBlocked = false;
  try {
    await rolesService.deleteRole(jamia2Role.id, jamia1Auth);
  } catch (error) {
    crossTenantDeleteBlocked = error?.statusCode === 404;
  }
  assert(crossTenantDeleteBlocked, 'Jamia1 cannot delete Jamia2 role');

  const systemRole = await prisma.role.findFirst({
    where: { tenantId: jamia1.id, roleName: 'admin' },
    select: { id: true },
  });

  let systemRoleDeleteBlocked = false;
  try {
    await rolesService.deleteRole(systemRole.id, jamia1Auth);
  } catch (error) {
    systemRoleDeleteBlocked = error?.statusCode === 403;
  }
  assert(systemRoleDeleteBlocked, 'System role delete is blocked');

  const updatedRole = await rolesService.updateRole(jamia1Role.id, { description: 'Updated by same tenant' }, jamia1Auth);
  assert(updatedRole.description === 'Updated by same tenant', 'Same tenant role update is allowed');

  let invalidPermissionRejected = false;
  try {
    await rolesService.assignPermissionsToRole(jamia1Role.id, { permissions: ['students.view', 'missing.permission'] }, jamia1Auth);
  } catch (error) {
    invalidPermissionRejected = error?.statusCode === 400 && /missing\.permission/.test(error.message);
  }
  assert(invalidPermissionRejected, 'Invalid permission key is rejected with a clear error');

  const assignedRole = await rolesService.assignPermissionsToRole(
    jamia1Role.id,
    { permissions: ['students.view', 'students.view', 'attendance.mark'] },
    jamia1Auth,
  );
  const assignedKeys = assignedRole.permissions.map((permission) => permission.permissionKey).sort();
  assert(assignedKeys.length === 2, 'Duplicate permission keys are safely de-duplicated');
  assert(assignedKeys.includes('students.view') && assignedKeys.includes('attendance.mark'), 'Update returns assigned permissions');

  const fetchedPermissions = await rolesService.getRolePermissionsById(jamia1Role.id, jamia1Auth);
  const fetchedKeys = fetchedPermissions.permissions.map((permission) => permission.permissionKey).sort();
  assert(JSON.stringify(fetchedKeys) === JSON.stringify(assignedKeys), 'GET role permissions returns current assignment');

  const mappingTenantRows = await prisma.$queryRaw`
    SELECT COUNT(*) AS total
    FROM role_permissions
    WHERE role_id = ${jamia1Role.id}
      AND tenant_id = ${jamia1.id}
  `;
  assert(Number(mappingTenantRows[0]?.total || 0) === 2, 'RolePermission tenantId is set from backend tenant context');

  let crossTenantPermissionUpdateBlocked = false;
  try {
    await rolesService.assignPermissionsToRole(jamia2Role.id, { permissions: ['students.view'] }, jamia1Auth);
  } catch (error) {
    crossTenantPermissionUpdateBlocked = error?.statusCode === 404;
  }
  assert(crossTenantPermissionUpdateBlocked, 'Jamia1 cannot assign permissions to Jamia2 role');

  let systemRolePermissionBlocked = false;
  try {
    await rolesService.assignPermissionsToRole(systemRole.id, { permissions: ['students.view'] }, jamia1Auth);
  } catch (error) {
    systemRolePermissionBlocked = error?.statusCode === 403;
  }
  assert(systemRolePermissionBlocked, 'Tenant admin cannot change system role permissions');

  await rolesService.deleteRole(jamia1Role.id, jamia1Auth);
  await rolesService.deleteRole(jamia2Role.id, jamia2Auth);

  console.log('\nRole CRUD tenant isolation test results');
  console.log('======================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
};

run()
  .catch((error) => {
    console.error('Role CRUD tenant isolation test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
