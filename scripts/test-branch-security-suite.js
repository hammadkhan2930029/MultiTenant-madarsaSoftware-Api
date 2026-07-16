import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authMiddleware } from '../src/middlewares/auth.middleware.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { branchesService } from '../src/modules/branches/branches.service.js';
import { reportsService } from '../src/modules/reports/reports.service.js';
import { seedDefaultTenantRoles } from '../src/modules/roles/tenantRoleSeeder.service.js';
import { storeService } from '../src/modules/store/store.service.js';
import { studentsService } from '../src/modules/students/students.service.js';
import { tenantsService } from '../src/modules/tenants/tenants.service.js';
import { usersService } from '../src/modules/users/users.service.js';

const PASSWORD = 'Prompt18@123';
const TENANT_CODE = 'qa_branch_security_jamia1';
const OTHER_TENANT_CODE = 'qa_branch_security_jamia2';
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
  await prisma.$executeRaw`DELETE FROM store_approval_logs WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_purchase_items WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_purchases WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_supplier_payments WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_suppliers WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_stock_adjustments WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_damaged_stock WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_returns WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_stock_issues WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_items WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_categories WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM store_units WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM student_parents WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM student_class_assignments WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM students WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM parents WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM sections WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM classes WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM branches WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM admins WHERE tenant_id = ${tenantId}`;
  await prisma.$executeRaw`DELETE FROM roles WHERE tenant_id = ${tenantId} AND is_system_role = false`;
};

const upsertTenant = async ({ tenantCode, name, subdomain, branchEnabled = true, branchLimit = 10, status = 'active' }) => {
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
  const role = await prisma.role.findFirst({ where: { tenantId, roleName } });
  if (!role) throw new Error(`Missing role ${roleName}`);
  return role;
};

const createRole = async (tenantId, roleName, permissionKeys = []) => {
  await prisma.$executeRaw`
    INSERT INTO roles (tenant_id, role_name, description, status, is_system_role)
    VALUES (${tenantId}, ${roleName}, ${`${roleName} test role`}, 'active', false)
  `;

  const role = await getRole(tenantId, roleName);
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

const createAdmin = async ({ tenant, role, username, branchId = null, status = 'active' }) => {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  return prisma.admin.create({
    data: {
      name: username,
      email: `${username}@example.test`,
      username,
      password: hashedPassword,
      role: role.roleName,
      roleId: role.id,
      tenantId: tenant.id,
      branchId,
      status,
    },
  });
};

const createTenantAdmin = async (tenant) => {
  const role = await getRole(tenant.id, 'admin');
  const admin = await createAdmin({ tenant, role, username: `qa-security-admin-${tenant.tenantCode}` });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ownerAdminId: admin.id } });
  return admin;
};

const requester = (tenant, admin, extra = {}) => ({
  tenantId: tenant.id,
  isTenantAdmin: true,
  isSuperAdmin: false,
  admin,
  ...extra,
});

const branchScope = (tenantId, branchId) => ({
  tenantId,
  branchId,
  resolvedBranchId: branchId,
  requestedBranchId: branchId,
  branchIds: [branchId],
  isBranchScoped: true,
  where: { tenantId, branchId },
});

const login = (tenant, username) => authService.loginAdmin(
  { identity: username, password: PASSWORD },
  { tenantId: tenant.id, isSystemHost: false },
);

const runAuthMiddleware = async ({ tenant, token, method = 'GET', originalUrl = '/api/students', query = {}, body = {} }) => {
  const req = {
    headers: { authorization: `Bearer ${token}` },
    method,
    originalUrl,
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

const createStudentRecord = async ({ tenant, branch, suffix }) =>
  prisma.student.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      admissionNumber: `QA-SEC-${suffix}`,
      fullName: `QA Security Student ${suffix}`,
      fatherName: `Guardian ${suffix}`,
      gender: 'Male',
      status: 'active',
    },
  });

const ensureAcademicSession = async () => {
  const name = 'QA Branch Security Session 2026-2027';
  const data = {
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2027-03-31T00:00:00.000Z'),
    status: 'active',
  };

  const existing = await prisma.academicSession.findUnique({ where: { name } });
  if (existing) {
    return prisma.academicSession.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.academicSession.create({
    data: { name, ...data },
  });
};

const createClassSectionAssignment = async ({ tenant, branch, student, suffix, session }) => {
  const academicClass = await prisma.academicClass.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      name: `QA Security Class ${suffix}`,
      status: 'active',
    },
  });

  const section = await prisma.section.create({
    data: {
      tenantId: tenant.id,
      classId: academicClass.id,
      name: `QA Security Section ${suffix}`,
      status: 'active',
    },
  });

  return prisma.studentClassAssignment.create({
    data: {
      tenantId: tenant.id,
      studentId: student.id,
      branchId: branch.id,
      classId: academicClass.id,
      sectionId: section.id,
      sessionId: session.id,
      status: 'active',
    },
  });
};

const createPendingStorePurchase = async ({ tenant, branch, suffix, branchScope }) => {
  const category = await storeService.createCategory(tenant.id, {
    name: `QA Security Store Category ${suffix}`,
    description: 'Branch security approval test',
    status: 'active',
  });
  const unit = await storeService.createUnit(tenant.id, {
    name: `QA Security Unit ${suffix}`,
    shortName: `qa-sec-${suffix.toLowerCase()}`,
    description: 'Branch security approval test unit',
    status: 'active',
  });
  const item = await storeService.createItem(tenant.id, {
    itemName: `QA Security Store Item ${suffix}`,
    category: category.name,
    unit: unit.name,
    itemCode: `QA-SEC-ITEM-${suffix}`,
    quantity: 0,
    purchasePrice: 10,
    status: 'active',
  });

  return storeService.createPurchase(
    tenant.id,
    {
      body: {
        branchId: branch.id,
        purchaseDate: '2026-07-16',
        supplierName: `QA Security Supplier ${suffix}`,
        mobileNumber: `0300${String(branch.id).padStart(7, '0')}`.slice(0, 11),
        invoiceNumber: `QA-SEC-INV-${suffix}`,
        paidAmount: 0,
        paymentMethod: 'Cash',
        approvalStatus: 'pending',
        items: [
          {
            itemId: item.id,
            unitId: unit.id,
            quantity: 1,
            rate: 10,
          },
        ],
      },
      file: null,
    },
    branchScope
  );
};

const run = async () => {
  const tenant = await upsertTenant({
    tenantCode: TENANT_CODE,
    name: 'QA Branch Security Jamia 1',
    subdomain: 'branch-security-jamia1',
  });
  const otherTenant = await upsertTenant({
    tenantCode: OTHER_TENANT_CODE,
    name: 'QA Branch Security Jamia 2',
    subdomain: 'branch-security-jamia2',
  });
  const admin = await createTenantAdmin(tenant);
  const otherAdmin = await createTenantAdmin(otherTenant);
  const adminRequester = requester(tenant, admin);
  const otherRequester = requester(otherTenant, otherAdmin);

  const branchA = await branchesService.createBranch(tenant.id, { name: 'Security Branch A', code: 'SEC-A', address: 'Lahore' }, admin);
  const branchB = await branchesService.createBranch(tenant.id, { name: 'Security Branch B', code: 'SEC-B', address: 'Lahore' }, admin);
  const otherBranch = await branchesService.createBranch(otherTenant.id, { name: 'Other Security Branch', code: 'SEC-A', address: 'Karachi' }, otherAdmin);

  const studentA = await createStudentRecord({ tenant, branch: branchA, suffix: 'A' });
  const studentB = await createStudentRecord({ tenant, branch: branchB, suffix: 'B' });
  const otherStudent = await createStudentRecord({ tenant: otherTenant, branch: otherBranch, suffix: 'OTHER' });
  const session = await ensureAcademicSession();
  await createClassSectionAssignment({ tenant, branch: branchA, student: studentA, suffix: 'A', session });
  await createClassSectionAssignment({ tenant, branch: branchB, student: studentB, suffix: 'B', session });
  await createClassSectionAssignment({ tenant: otherTenant, branch: otherBranch, student: otherStudent, suffix: 'OTHER', session });

  const tenantAdminLogin = await login(tenant, admin.username);
  const tenantMismatch = await runAuthMiddleware({ tenant: otherTenant, token: tenantAdminLogin.token, originalUrl: '/api/branches' });
  assert(tenantMismatch.error?.statusCode === 403, 'Tenant Admin cannot access another tenant branch list by changing tenant context');

  const createdWithTamperedTenant = await branchesService.createBranch(
    tenant.id,
    { tenantId: otherTenant.id, name: 'Tampered Tenant Branch', code: 'SEC-TAMPER', address: 'Lahore' },
    admin
  );
  assert(createdWithTamperedTenant.tenantId === tenant.id, 'Tenant Admin branch create ignores body tenantId');

  let crossTenantUpdateBlocked = false;
  try {
    await branchesService.updateBranch(tenant.id, otherBranch.id, { name: otherBranch.name, code: otherBranch.code, address: otherBranch.address || '', status: 'active' });
  } catch (error) {
    crossTenantUpdateBlocked = error?.statusCode === 404;
  }
  assert(crossTenantUpdateBlocked, 'Tenant Admin cannot update another tenant branch by URL ID replacement');

  let crossTenantDeleteBlocked = false;
  try {
    await branchesService.deleteBranch(tenant.id, otherBranch.id);
  } catch (error) {
    crossTenantDeleteBlocked = error?.statusCode === 404;
  }
  assert(crossTenantDeleteBlocked, 'Tenant Admin cannot delete another tenant branch by URL ID replacement');

  await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: false, branchLimit: 10 });
  let disabledCreateBlocked = false;
  try {
    await branchesService.createBranch(tenant.id, { name: 'Disabled Create', code: 'SEC-DISABLED', address: 'Lahore' }, admin);
  } catch (error) {
    disabledCreateBlocked = error?.statusCode === 403;
  }
  assert(disabledCreateBlocked, 'Branch disabled tenant cannot create branch');
  await tenantsService.updateTenantBranchSettings(tenant.id, { branchEnabled: true, branchLimit: 3 });

  let limitBlocked = false;
  try {
    await branchesService.createBranch(tenant.id, { name: 'Over Limit Branch', code: 'SEC-LIMIT', address: 'Lahore' }, admin);
  } catch (error) {
    limitBlocked = error?.statusCode === 400;
  }
  assert(limitBlocked, 'Branch limit complete blocks new branch creation');

  await tenantsService.updateTenantBranchLimit(tenant.id, { branchLimit: 4 });
  const concurrentResults = await Promise.allSettled([
    branchesService.createBranch(tenant.id, { name: 'Concurrent Security One', code: 'SEC-CON-1', address: 'Lahore' }, admin),
    branchesService.createBranch(tenant.id, { name: 'Concurrent Security Two', code: 'SEC-CON-2', address: 'Lahore' }, admin),
  ]);
  assert(
    concurrentResults.filter((item) => item.status === 'fulfilled').length === 1 &&
      concurrentResults.filter((item) => item.status === 'rejected' && item.reason?.statusCode === 400).length === 1,
    'Concurrent branch create requests cannot bypass limit'
  );

  const teacherRole = await getRole(tenant.id, 'teacher');
  const branchUser = await usersService.createUser({
    name: 'QA Security Branch User',
    email: 'qa-security-branch-user@example.test',
    username: 'qa-security-branch-user',
    password: PASSWORD,
    roleId: teacherRole.id,
    branchId: branchA.id,
    status: 'active',
  }, adminRequester);
  const scopeA = branchScope(tenant.id, branchA.id);

  const branchList = await studentsService.getStudents(tenant.id, { page: 1, limit: 20, branchId: branchB.id }, scopeA);
  assert(branchList.items.some((student) => student.id === studentA.id), 'Branch User can list own branch data');
  assert(!branchList.items.some((student) => student.id === studentB.id), 'Branch User cannot list same-tenant other branch data via query branchId replacement');

  let branchDetailBlocked = false;
  try {
    await studentsService.getStudentById(tenant.id, studentB.id, scopeA);
  } catch (error) {
    branchDetailBlocked = error?.statusCode === 404;
  }
  assert(branchDetailBlocked, 'Branch User cannot detail same-tenant other branch data by URL ID replacement');

  let branchUpdateBlocked = false;
  try {
    await studentsService.updateStudent(tenant.id, studentB.id, { body: { fullName: 'Tampered Student', fatherName: 'Guardian', gender: 'Male' }, branchScope: scopeA });
  } catch (error) {
    branchUpdateBlocked = error?.statusCode === 404;
  }
  assert(branchUpdateBlocked, 'Branch User cannot update same-tenant other branch data by URL ID replacement');

  let branchDeleteBlocked = false;
  try {
    await studentsService.deleteStudent(tenant.id, studentB.id, scopeA);
  } catch (error) {
    branchDeleteBlocked = error?.statusCode === 404;
  }
  assert(branchDeleteBlocked, 'Branch User cannot delete same-tenant other branch data by URL ID replacement');

  const createdStudent = await studentsService.createStudent(tenant.id, {
    body: {
      tenantId: otherTenant.id,
      branchId: branchB.id,
      admissionNumber: 'QA-SEC-BODY',
      fullName: 'Body Tampered Student',
      fatherName: 'Guardian',
      gender: 'Male',
    },
    file: null,
    branchScope: scopeA,
  });
  assert(createdStudent.tenantId === tenant.id, 'Body tenantId replacement is ignored on branch-scoped create');
  assert(createdStudent.branchId === branchA.id, 'Body branchId replacement is ignored on branch-scoped create');

  const report = await reportsService.getStudentsReport(tenant.id, { page: 1, limit: 20, branchId: branchB.id }, scopeA);
  assert(!report.items.some((student) => student.id === studentB.id), 'Report/export-style branchId manipulation cannot expose other branch students');

  const pendingPurchaseB = await createPendingStorePurchase({
    tenant,
    branch: branchB,
    suffix: 'B',
    branchScope: branchScope(tenant.id, branchB.id),
  });
  const branchApprovals = await storeService.getApprovals(tenant.id, scopeA);
  assert(
    !branchApprovals.purchases.some((purchase) => purchase.id === pendingPurchaseB.id),
    'Branch User cannot list same-tenant other branch store approvals'
  );
  let branchApprovalIdorBlocked = false;
  try {
    await storeService.approveApproval({
      tenantId: tenant.id,
      moduleType: 'purchase',
      id: pendingPurchaseB.id,
      admin: branchUser,
      branchScope: scopeA,
    });
  } catch (error) {
    branchApprovalIdorBlocked = error?.statusCode === 404;
  }
  assert(branchApprovalIdorBlocked, 'Branch User cannot approve same-tenant other branch store approval by URL ID replacement');

  await prisma.branch.update({ where: { id: branchA.id }, data: { status: 'inactive' } });
  let inactiveBranchUserBlocked = false;
  try {
    await login(tenant, branchUser.username);
  } catch (error) {
    inactiveBranchUserBlocked = error?.statusCode === 403;
  }
  assert(inactiveBranchUserBlocked, 'Branch inactive user cannot access protected modules');
  await prisma.branch.update({ where: { id: branchA.id }, data: { status: 'active' } });

  const noPermissionRole = await createRole(tenant.id, 'qa_security_no_permissions', []);
  await createAdmin({ tenant, role: noPermissionRole, username: 'qa-security-no-permission' });
  const noPermissionLogin = await login(tenant, 'qa-security-no-permission');
  const directApiDenied = await runAuthMiddleware({ tenant, token: noPermissionLogin.token, originalUrl: '/api/students' });
  assert(directApiDenied.error?.statusCode === 403, 'Module permission missing direct API is denied');

  const superAdminTenants = await tenantsService.getTenantsWithBranchSettings({ page: 1, limit: 100, search: 'QA Branch Security' });
  const tenantCodes = superAdminTenants.items.map((item) => item.tenantCode);
  assert(tenantCodes.includes(TENANT_CODE) && tenantCodes.includes(OTHER_TENANT_CODE), 'Super Admin authorized tenant branch endpoint can see all tenant branch summaries');

  const tenantAdminStudents = await studentsService.getStudents(tenant.id, { page: 1, limit: 50 }, null);
  assert(
    tenantAdminStudents.items.some((student) => student.id === studentA.id) &&
      tenantAdminStudents.items.some((student) => student.id === studentB.id),
    'Existing tenant-level users still see tenant-level branch-consolidated data'
  );

  console.log('\nBranch security and data isolation test results');
  console.log('===============================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
  console.log('Remaining risks: UI visual regression is covered by frontend build/manual review, not pixel snapshots in this backend suite.');
};

run()
  .catch((error) => {
    console.error('Branch security and data isolation test failed');
    console.error(error);
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
