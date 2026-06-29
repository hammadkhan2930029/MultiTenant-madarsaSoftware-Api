import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/modules/auth/auth.service.js';
import { studentsService } from '../src/modules/students/students.service.js';

const PASSWORD = 'Prompt24@123';
const ADMIN_USERNAME = 'qa-p24-admin';
const ADMIN_EMAIL = 'qa-p24-admin@example.test';
const STUDENT_NAME = 'Prompt 24 Same Student';
const ADMISSION_NUMBER = 'QA-P24-001';

const tenants = [
  {
    tenantCode: 'qa_p24_jamia1',
    name: 'QA Prompt 24 Jamia 1',
    subdomain: 'jamia1',
  },
  {
    tenantCode: 'qa_p24_jamia2',
    name: 'QA Prompt 24 Jamia 2',
    subdomain: 'jamia2',
  },
];

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

const getAdminRole = async () => {
  const role = await prisma.role.findUnique({
    where: { roleName: 'admin' },
    select: { id: true, roleName: true },
  });

  return role || null;
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

  return tenant;
};

const upsertTenantAdmin = async (tenant, role) => {
  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const existingAdmin = await prisma.admin.findFirst({
    where: {
      tenantId: tenant.id,
      username: ADMIN_USERNAME,
    },
  });

  const admin = existingAdmin
    ? await prisma.admin.update({
        where: { id: existingAdmin.id },
        data: {
          name: `${tenant.name} Admin`,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          password: hashedPassword,
          role: role?.roleName || 'admin',
          roleId: role?.id || null,
          tenantId: tenant.id,
          status: 'active',
        },
      })
    : await prisma.admin.create({
        data: {
          name: `${tenant.name} Admin`,
          email: ADMIN_EMAIL,
          username: ADMIN_USERNAME,
          password: hashedPassword,
          role: role?.roleName || 'admin',
          roleId: role?.id || null,
          tenantId: tenant.id,
          status: 'active',
        },
      });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerAdminId: admin.id },
  });

  await prisma.madrassaProfile.upsert({
    where: { tenantId: tenant.id },
    update: {
      adminId: admin.id,
      name: tenant.name,
      email: ADMIN_EMAIL,
      branch: 'QA Campus',
      city: 'QA City',
      status: 'active',
    },
    create: {
      adminId: admin.id,
      tenantId: tenant.id,
      name: tenant.name,
      email: ADMIN_EMAIL,
      branch: 'QA Campus',
      city: 'QA City',
      status: 'active',
    },
  });

  return admin;
};

const ensureStudent = async (tenant, maliciousTenantId = null) => {
  const body = {
    tenantId: maliciousTenantId,
    admissionNumber: ADMISSION_NUMBER,
    fullName: STUDENT_NAME,
    fatherName: 'Prompt 24 Father',
    gender: 'male',
    email: 'qa-p24-student@example.test',
    phone: `0300${String(tenant.id).padStart(7, '0')}`.slice(0, 11),
    address: 'Prompt 24 test address',
  };

  const existingStudent = await prisma.student.findFirst({
    where: {
      tenantId: tenant.id,
      admissionNumber: ADMISSION_NUMBER,
    },
    select: { id: true },
  });

  if (existingStudent) {
    return studentsService.updateStudent(tenant.id, existingStudent.id, { body, file: null });
  }

  return studentsService.createStudent(tenant.id, { body, file: null });
};

const loginForTenant = (tenant) =>
  authService.loginAdmin(
    {
      identity: ADMIN_USERNAME,
      password: PASSWORD,
    },
    {
      tenantId: tenant.id,
      isSystemHost: false,
    }
  );

const run = async () => {
  const adminRole = await getAdminRole();
  const setup = [];

  for (const tenantSeed of tenants) {
    const tenant = await upsertTenant(tenantSeed);
    const admin = await upsertTenantAdmin(tenant, adminRole);
    setup.push({ tenant, admin });
  }

  assert(setup.length === 2, 'Two fake tenants are available', setup.map((item) => item.tenant.subdomain).join(', '));
  assert(setup[0].admin.email === setup[1].admin.email, 'Same admin email is allowed tenant-wise', ADMIN_EMAIL);
  assert(setup[0].admin.username === setup[1].admin.username, 'Same admin username is allowed tenant-wise', ADMIN_USERNAME);

  const jamia1Login = await loginForTenant(setup[0].tenant);
  const jamia2Login = await loginForTenant(setup[1].tenant);
  assert(Boolean(jamia1Login.token && jamia2Login.token), 'Both tenant admins can login separately');
  assert(jamia1Login.admin.tenantId === setup[0].tenant.id, 'Jamia1 login token belongs to Jamia1');
  assert(jamia2Login.admin.tenantId === setup[1].tenant.id, 'Jamia2 login token belongs to Jamia2');

  const jamia1Student = await ensureStudent(setup[0].tenant, setup[1].tenant.id);
  const jamia2Student = await ensureStudent(setup[1].tenant, setup[0].tenant.id);
  assert(jamia1Student.tenantId === setup[0].tenant.id, 'API ignores direct tenantId tampering for Jamia1 student create/update');
  assert(jamia2Student.tenantId === setup[1].tenant.id, 'API ignores direct tenantId tampering for Jamia2 student create/update');
  assert(jamia1Student.fullName === jamia2Student.fullName, 'Same student name is allowed in both tenants', STUDENT_NAME);
  assert(jamia1Student.admissionNumber === jamia2Student.admissionNumber, 'Same admission number is allowed tenant-wise', ADMISSION_NUMBER);

  const jamia1List = await studentsService.getStudents(setup[0].tenant.id, { page: 1, limit: 100, search: STUDENT_NAME });
  const jamia2List = await studentsService.getStudents(setup[1].tenant.id, { page: 1, limit: 100, search: STUDENT_NAME });
  assert(jamia1List.items.every((student) => student.tenantId === setup[0].tenant.id), 'Jamia1 student list contains only Jamia1 records');
  assert(jamia2List.items.every((student) => student.tenantId === setup[1].tenant.id), 'Jamia2 student list contains only Jamia2 records');

  let crossTenantBlocked = false;
  try {
    await studentsService.getStudentById(setup[1].tenant.id, jamia1Student.id);
  } catch (error) {
    crossTenantBlocked = error?.statusCode === 404;
  }
  assert(crossTenantBlocked, 'Jamia1 student cannot be fetched from Jamia2 tenant context');

  let inactiveTenantBlocked = false;
  try {
    await prisma.tenant.update({
      where: { id: setup[1].tenant.id },
      data: { status: 'inactive' },
    });
    await loginForTenant(setup[1].tenant);
  } catch (error) {
    inactiveTenantBlocked = error?.statusCode === 403;
  } finally {
    await prisma.tenant.update({
      where: { id: setup[1].tenant.id },
      data: { status: 'active' },
    });
  }
  assert(inactiveTenantBlocked, 'Inactive tenant login is blocked');

  console.log('\nPrompt 24 two-tenant test results');
  console.log('=================================');
  for (const result of results) {
    console.log(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
  }
  console.log('\nTest credentials');
  console.log(`jamia1 / jamia2 username: ${ADMIN_USERNAME}`);
  console.log(`jamia1 / jamia2 password: ${PASSWORD}`);
};

run()
  .catch((error) => {
    console.error('\nPrompt 24 two-tenant test failed');
    for (const result of results) {
      console.error(`${result.status}: ${result.name}${result.details ? ` (${result.details})` : ''}`);
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
