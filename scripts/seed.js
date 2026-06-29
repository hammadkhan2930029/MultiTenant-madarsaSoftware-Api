import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

const tenantSeed = {
  tenantCode: 'default',
  name: 'Default Madrassa',
  status: 'active',
};

const tenantAdminSeed = {
  name: 'System Admin',
  email: 'admin@madarsa.local',
  username: 'admin',
  password: 'Admin@12345',
  role: 'admin',
  status: 'active',
};

const superAdminSeed = {
  name: 'Super Admin',
  email: 'superadmin@madarsa.local',
  username: 'superadmin',
  password: 'Admin@12345',
  role: 'super_admin',
  status: 'active',
};

const sampleDates = {
  sessionStart: new Date('2026-04-01T00:00:00.000Z'),
  sessionEnd: new Date('2027-03-31T00:00:00.000Z'),
  studentAttendance: new Date('2026-05-10T00:00:00.000Z'),
  teacherAttendance: new Date('2026-05-10T00:00:00.000Z'),
  hifzDaily: new Date('2026-05-10T00:00:00.000Z'),
  hifzWeeklyStart: new Date('2026-05-04T00:00:00.000Z'),
  hifzWeeklyEnd: new Date('2026-05-10T00:00:00.000Z'),
  siparaStart: new Date('2026-04-20T00:00:00.000Z'),
  siparaEnd: new Date('2026-05-05T00:00:00.000Z'),
  fundPayment: new Date('2026-05-08T00:00:00.000Z'),
  salaryPayment: new Date('2026-05-09T00:00:00.000Z'),
};

const toDecimal = (value) => value.toFixed(2);

const ensureTenant = () =>
  prisma.tenant.upsert({
    where: { tenantCode: tenantSeed.tenantCode },
    update: {
      name: tenantSeed.name,
      status: tenantSeed.status,
    },
    create: tenantSeed,
  });

const ensureAdmin = async (seed, tenantId = null) => {
  const hashedPassword = await bcrypt.hash(seed.password, 12);
  const existing = await prisma.admin.findFirst({
    where: { tenantId, username: seed.username },
  });

  const data = {
    tenantId,
    name: seed.name,
    email: seed.email,
    username: seed.username,
    password: hashedPassword,
    role: seed.role,
    status: seed.status,
  };

  return existing
    ? prisma.admin.update({ where: { id: existing.id }, data })
    : prisma.admin.create({ data });
};

const ensureMadrassaProfile = (admin, tenantId) =>
  prisma.madrassaProfile.upsert({
    where: { adminId: admin.id },
    update: {
      tenantId,
      name: 'Jamia Anwar ul Quran',
      email: admin.email,
      status: 'active',
    },
    create: {
      adminId: admin.id,
      tenantId,
      name: 'Jamia Anwar ul Quran',
      email: admin.email,
      phone1: '0300-1234567',
      phone2: '0321-7654321',
      address: 'Township, Lahore',
      branch: 'Main Campus',
      city: 'Lahore',
      familyNoSeq: 'FAM-2026-001',
      regNo: 'REG-QA-9921',
      status: 'active',
    },
  });

const ensureCity = (name) =>
  prisma.city.upsert({
    where: { name },
    update: { status: 'active' },
    create: { name, status: 'active' },
  });

const ensureShift = () =>
  prisma.shift.upsert({
    where: { name: 'Morning Shift' },
    update: {
      startTime: '07:00',
      endTime: '12:00',
      type: 'morning',
      status: 'active',
    },
    create: {
      name: 'Morning Shift',
      startTime: '07:00',
      endTime: '12:00',
      type: 'morning',
      status: 'active',
    },
  });

const ensureBranch = (tenantId) =>
  prisma.branch.upsert({
    where: { tenantId_name: { tenantId, name: 'Main Campus' } },
    update: {
      code: 'MC-01',
      address: 'Madarsa Road, Lahore',
      status: 'active',
    },
    create: {
      tenantId,
      name: 'Main Campus',
      code: 'MC-01',
      address: 'Madarsa Road, Lahore',
      status: 'active',
    },
  });

const ensureClass = (tenantId, branchId) =>
  prisma.academicClass.upsert({
    where: { branchId_name: { branchId, name: 'Hifz A' } },
    update: { tenantId, status: 'active' },
    create: { tenantId, name: 'Hifz A', branchId, status: 'active' },
  });

const ensureSection = (tenantId, classId) =>
  prisma.section.upsert({
    where: { classId_name: { classId, name: 'Section Blue' } },
    update: { tenantId, status: 'active' },
    create: { tenantId, name: 'Section Blue', classId, status: 'active' },
  });

const ensureSession = () =>
  prisma.academicSession.upsert({
    where: { name: '2026-2027' },
    update: {
      startDate: sampleDates.sessionStart,
      endDate: sampleDates.sessionEnd,
      status: 'active',
    },
    create: {
      name: '2026-2027',
      startDate: sampleDates.sessionStart,
      endDate: sampleDates.sessionEnd,
      status: 'active',
    },
  });

const ensureParent = async (tenantId, data) => {
  const existing = await prisma.parent.findFirst({
    where: {
      tenantId,
      fullName: data.fullName,
      OR: [{ phone: data.phone }, { email: data.email }],
    },
  });

  const nextData = { tenantId, ...data, status: 'active' };
  return existing
    ? prisma.parent.update({ where: { id: existing.id }, data: nextData })
    : prisma.parent.create({ data: nextData });
};

const ensureStudent = (tenantId, data) =>
  prisma.student.upsert({
    where: {
      tenantId_admissionNumber: {
        tenantId,
        admissionNumber: data.admissionNumber,
      },
    },
    update: {
      ...data,
      status: 'active',
    },
    create: {
      tenantId,
      ...data,
      status: 'active',
    },
  });

const ensureStudentParentLink = (studentId, parentId, relationship, isPrimary) =>
  prisma.studentParent.upsert({
    where: {
      studentId_parentId_relationship: {
        studentId,
        parentId,
        relationship,
      },
    },
    update: { isPrimary },
    create: { studentId, parentId, relationship, isPrimary },
  });

const ensureAssignment = async (tenantId, studentId, branchId, classId, sectionId, sessionId) => {
  const existing = await prisma.studentClassAssignment.findFirst({
    where: { tenantId, studentId, branchId, classId, sectionId, sessionId, status: 'active' },
  });

  if (existing) return existing;

  await prisma.studentClassAssignment.updateMany({
    where: { tenantId, studentId, status: 'active' },
    data: { status: 'inactive' },
  });

  return prisma.studentClassAssignment.create({
    data: { tenantId, studentId, branchId, classId, sectionId, sessionId, status: 'active' },
  });
};

const ensureTeacher = async (tenantId, shiftId, data) => {
  const existing = await prisma.teacher.findFirst({
    where: { tenantId, OR: [{ phone: data.phone }, { cnic: data.cnic }] },
  });

  const nextData = {
    tenantId,
    shiftId,
    ...data,
    basicSalary: toDecimal(data.basicSalary),
    status: 'active',
  };

  return existing
    ? prisma.teacher.update({ where: { id: existing.id }, data: nextData })
    : prisma.teacher.create({ data: nextData });
};

const ensureFinanceHead = (tenantId, data) =>
  prisma.financeHead.upsert({
    where: { tenantId_name: { tenantId, name: data.name } },
    update: { ...data, status: 'active' },
    create: { tenantId, ...data, status: 'active' },
  });

const ensureStudentAttendance = (studentId, branchId, classId, sectionId) =>
  prisma.studentAttendance.upsert({
    where: { studentId_date: { studentId, date: sampleDates.studentAttendance } },
    update: { branchId, classId, sectionId, status: 'Present', remarks: 'Seeded attendance entry' },
    create: {
      studentId,
      branchId,
      classId,
      sectionId,
      date: sampleDates.studentAttendance,
      status: 'Present',
      remarks: 'Seeded attendance entry',
    },
  });

const ensureTeacherAttendance = (teacherId, branchId) =>
  prisma.teacherAttendance.upsert({
    where: { teacherId_date: { teacherId, date: sampleDates.teacherAttendance } },
    update: { branchId, status: 'Present', remarks: 'Seeded teacher attendance' },
    create: {
      teacherId,
      branchId,
      date: sampleDates.teacherAttendance,
      status: 'Present',
      remarks: 'Seeded teacher attendance',
    },
  });

const ensureDailyHifz = (studentId) =>
  prisma.hifzDailyEntry.upsert({
    where: { studentId_date: { studentId, date: sampleDates.hifzDaily } },
    update: { performanceStatus: 'Good', remarks: 'Seeded daily hifz entry', status: 'active' },
    create: {
      studentId,
      date: sampleDates.hifzDaily,
      sabq: 'Surah Baqarah Ruku 1',
      sabaqi: 'Surah Fatiha',
      manzil: 'Juz 1',
      performanceStatus: 'Good',
      remarks: 'Seeded daily hifz entry',
      status: 'active',
    },
  });

const ensureWeeklyHifz = (studentId) =>
  prisma.hifzWeeklyEntry.upsert({
    where: {
      studentId_weekStartDate_weekEndDate: {
        studentId,
        weekStartDate: sampleDates.hifzWeeklyStart,
        weekEndDate: sampleDates.hifzWeeklyEnd,
      },
    },
    update: { performanceStatus: 'Good', remarks: 'Seeded weekly hifz entry', status: 'active' },
    create: {
      studentId,
      weekStartDate: sampleDates.hifzWeeklyStart,
      weekEndDate: sampleDates.hifzWeeklyEnd,
      siparaFrom: '1',
      siparaTo: '2',
      lessonFrom: 'Ayat 1',
      lessonTo: 'Ayat 20',
      performanceStatus: 'Good',
      remarks: 'Seeded weekly hifz entry',
      status: 'active',
    },
  });

const ensureMonthlyHifz = (studentId) =>
  prisma.hifzMonthlyEntry.upsert({
    where: { studentId_month_year: { studentId, month: 5, year: 2026 } },
    update: { performanceStatus: 'Good', remarks: 'Seeded monthly hifz entry', status: 'active' },
    create: {
      studentId,
      month: 5,
      year: 2026,
      startSabq: 'Sipara 1',
      endSabq: 'Sipara 2',
      totalRecitation: '2 Siparay',
      performanceStatus: 'Good',
      remarks: 'Seeded monthly hifz entry',
      status: 'active',
    },
  });

const ensureSiparaHifz = (studentId) =>
  prisma.hifzSiparaEntry.upsert({
    where: { studentId_siparaNumber: { studentId, siparaNumber: 1 } },
    update: { performanceStatus: 'Excellent', remarks: 'Seeded sipara entry', status: 'active' },
    create: {
      studentId,
      siparaNumber: 1,
      startDate: sampleDates.siparaStart,
      endDate: sampleDates.siparaEnd,
      totalDays: 15,
      quality: 'Strong retention',
      performanceStatus: 'Excellent',
      remarks: 'Seeded sipara entry',
      status: 'active',
    },
  });

const ensureFundCollection = async (tenantId) => {
  const existing = await prisma.fundCollection.findFirst({
    where: { tenantId, collectionGroupId: 'FG-SEED-001', receiptNo: 'R-001' },
  });

  const data = {
    tenantId,
    donorName: 'Seed Donor',
    collectionGroupId: 'FG-SEED-001',
    careOf: 'Seed Care Of',
    phone: '03000000000',
    paymentMode: 'Cash',
    donationType: 'Donation',
    donationSubType: 'General Fund',
    purpose: 'Madrassa fund',
    amount: toDecimal(3500),
    receiptNo: 'R-001',
    details: 'Seeded donation collection',
    paymentDate: sampleDates.fundPayment,
    remarks: 'Seeded donation collection',
    status: 'active',
  };

  return existing
    ? prisma.fundCollection.update({ where: { id: existing.id }, data })
    : prisma.fundCollection.create({ data });
};

const ensureSalaryEntry = async (tenantId, teacherId, financeHeadId) => {
  const existing = await prisma.salaryEntry.findFirst({
    where: { tenantId, teacherId, salaryMonth: 5, salaryYear: 2026 },
  });

  const data = {
    tenantId,
    teacherId,
    financeHeadId,
    amount: toDecimal(25000),
    salaryMonth: 5,
    salaryYear: 2026,
    paymentDate: sampleDates.salaryPayment,
    remarks: 'Seeded salary payment',
    status: 'active',
  };

  return existing
    ? prisma.salaryEntry.update({ where: { id: existing.id }, data })
    : prisma.salaryEntry.create({ data });
};

const countSnapshot = async () => ({
  tenants: await prisma.tenant.count(),
  admins: await prisma.admin.count(),
  madrassaProfiles: await prisma.madrassaProfile.count(),
  cities: await prisma.city.count(),
  branches: await prisma.branch.count(),
  classes: await prisma.academicClass.count(),
  sections: await prisma.section.count(),
  sessions: await prisma.academicSession.count(),
  students: await prisma.student.count(),
  parents: await prisma.parent.count(),
  assignments: await prisma.studentClassAssignment.count(),
  teachers: await prisma.teacher.count(),
  financeHeads: await prisma.financeHead.count(),
  fundCollections: await prisma.fundCollection.count(),
  salaryEntries: await prisma.salaryEntry.count(),
});

const main = async () => {
  const tenant = await ensureTenant();
  const tenantAdmin = await ensureAdmin(tenantAdminSeed, tenant.id);
  const superAdmin = await ensureAdmin(superAdminSeed, null);

  await ensureMadrassaProfile(tenantAdmin, tenant.id);
  await ensureCity('Lahore');
  await ensureCity('Karachi');

  const shift = await ensureShift();
  const branch = await ensureBranch(tenant.id);
  const academicClass = await ensureClass(tenant.id, branch.id);
  const section = await ensureSection(tenant.id, academicClass.id);
  const session = await ensureSession();

  const father = await ensureParent(tenant.id, {
    fullName: 'Muhammad Aslam',
    familyNumber: 'FAM-1001',
    phone: '03001234567',
    email: 'aslam.parent@example.com',
    cnic: '35202-1234567-1',
    occupation: 'Businessman',
    address: 'Township, Lahore',
  });

  const mother = await ensureParent(tenant.id, {
    fullName: 'Ayesha Aslam',
    familyNumber: 'FAM-1002',
    phone: '03007654321',
    email: 'ayesha.parent@example.com',
    cnic: '35202-7654321-9',
    occupation: 'Teacher',
    address: 'Township, Lahore',
  });

  const student1 = await ensureStudent(tenant.id, {
    admissionNumber: 'STD-1001',
    admissionDate: new Date('2026-04-10T00:00:00.000Z'),
    admissionFee: toDecimal(5000),
    monthlyFee: toDecimal(1500),
    fullName: 'Abdullah Aslam',
    fatherName: 'Muhammad Aslam',
    gender: 'male',
    dob: new Date('2014-03-12T00:00:00.000Z'),
    phone: '03111222333',
    email: 'abdullah.student@example.com',
    address: 'Township, Lahore',
  });

  const student2 = await ensureStudent(tenant.id, {
    admissionNumber: 'STD-1002',
    admissionDate: new Date('2026-04-10T00:00:00.000Z'),
    admissionFee: toDecimal(5000),
    monthlyFee: toDecimal(1500),
    fullName: 'Fatima Noor',
    fatherName: 'Noor Ahmad',
    gender: 'female',
    dob: new Date('2015-07-08T00:00:00.000Z'),
    phone: '03114445566',
    email: 'fatima.student@example.com',
    address: 'Johar Town, Lahore',
  });

  await ensureStudentParentLink(student1.id, father.id, 'father', true);
  await ensureStudentParentLink(student1.id, mother.id, 'mother', false);
  await ensureStudentParentLink(student2.id, mother.id, 'guardian', true);

  await ensureAssignment(tenant.id, student1.id, branch.id, academicClass.id, section.id, session.id);
  await ensureAssignment(tenant.id, student2.id, branch.id, academicClass.id, section.id, session.id);

  const teacher = await ensureTeacher(tenant.id, shift.id, {
    staffType: 'teacher',
    fullName: 'Qari Ibrahim',
    email: 'ibrahim.teacher@example.com',
    phone: '03211234567',
    cnic: '35201-1234567-8',
    subject: 'Hifz',
    qualification: 'Shahadat ul Aalmiya',
    address: 'Model Town, Lahore',
    basicSalary: 25000,
  });

  await ensureTeacher(tenant.id, shift.id, {
    staffType: 'teacher',
    fullName: 'Ustani Maryam',
    email: 'maryam.teacher@example.com',
    phone: '03217654321',
    cnic: '35201-7654321-0',
    subject: 'Nazra',
    qualification: 'MA Islamiat',
    address: 'Wapda Town, Lahore',
    basicSalary: 22000,
  });

  const incomeHead = await ensureFinanceHead(tenant.id, {
    name: 'Donation Income',
    type: 'income',
    description: 'General donation collection',
  });

  const expenseHead = await ensureFinanceHead(tenant.id, {
    name: 'Teacher Salary',
    type: 'expense',
    description: 'Monthly staff salary payments',
  });

  await ensureStudentAttendance(student1.id, branch.id, academicClass.id, section.id);
  await ensureTeacherAttendance(teacher.id, branch.id);
  await ensureDailyHifz(student1.id);
  await ensureWeeklyHifz(student1.id);
  await ensureMonthlyHifz(student1.id);
  await ensureSiparaHifz(student1.id);
  await ensureFundCollection(tenant.id);
  await ensureSalaryEntry(tenant.id, teacher.id, expenseHead.id);

  const summary = await countSnapshot();

  console.log(
    JSON.stringify(
      {
        message: 'Seed completed successfully.',
        tenant: {
          id: tenant.id,
          tenantCode: tenant.tenantCode,
          name: tenant.name,
        },
        tenantAdmin: {
          username: tenantAdminSeed.username,
          email: tenantAdminSeed.email,
          password: tenantAdminSeed.password,
        },
        superAdmin: {
          username: superAdminSeed.username,
          email: superAdminSeed.email,
          password: superAdminSeed.password,
        },
        ids: {
          superAdminId: superAdmin.id,
          adminId: tenantAdmin.id,
          branchId: branch.id,
          classId: academicClass.id,
          sectionId: section.id,
          sessionId: session.id,
          studentId: student1.id,
          teacherId: teacher.id,
          incomeHeadId: incomeHead.id,
          expenseHeadId: expenseHead.id,
        },
        counts: summary,
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
