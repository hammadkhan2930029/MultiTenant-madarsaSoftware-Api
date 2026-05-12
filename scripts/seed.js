import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

const adminSeed = {
  name: 'System Admin',
  email: 'admin@madarsa.local',
  username: 'admin',
  password: 'Admin@12345',
  role: 'admin',
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

const ensureAdmin = async () => {
  const hashedPassword = await bcrypt.hash(adminSeed.password, 12);

  const admin = await prisma.admin.upsert({
    where: { username: adminSeed.username },
    update: {
      name: adminSeed.name,
      email: adminSeed.email,
      password: hashedPassword,
      role: adminSeed.role,
      status: adminSeed.status,
    },
    create: {
      name: adminSeed.name,
      email: adminSeed.email,
      username: adminSeed.username,
      password: hashedPassword,
      role: adminSeed.role,
      status: adminSeed.status,
    },
  });

  return admin;
};

const ensureMadrassaProfile = (adminId, email) =>
  prisma.madrassaProfile.upsert({
    where: { adminId },
    update: {
      name: 'Jamia Anwar ul Quran',
      email,
      phone1: '0300-1234567',
      phone2: '0321-7654321',
      address: 'Township, Lahore',
      branch: 'Main Campus',
      city: 'Lahore',
      familyNoSeq: 'FAM-2026-001',
      regNo: 'REG-QA-9921',
      status: 'active',
    },
    create: {
      adminId,
      name: 'Jamia Anwar ul Quran',
      email,
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

const ensureCity = async (name) => {
  const existing = await prisma.city.findUnique({
    where: { name },
  });

  if (existing) {
    return prisma.city.update({
      where: { id: existing.id },
      data: { status: 'active' },
    });
  }

  return prisma.city.create({
    data: {
      name,
      status: 'active',
    },
  });
};

const ensureBranch = () =>
  prisma.branch.upsert({
    where: { name: 'Main Campus' },
    update: {
      code: 'MC-01',
      address: 'Madarsa Road, Lahore',
      status: 'active',
    },
    create: {
      name: 'Main Campus',
      code: 'MC-01',
      address: 'Madarsa Road, Lahore',
      status: 'active',
    },
  });

const ensureClass = (branchId) =>
  prisma.academicClass.upsert({
    where: {
      branchId_name: {
        branchId,
        name: 'Hifz A',
      },
    },
    update: {
      status: 'active',
    },
    create: {
      name: 'Hifz A',
      branchId,
      status: 'active',
    },
  });

const ensureSection = (classId) =>
  prisma.section.upsert({
    where: {
      classId_name: {
        classId,
        name: 'Section Blue',
      },
    },
    update: {
      status: 'active',
    },
    create: {
      name: 'Section Blue',
      classId,
      status: 'active',
    },
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

const ensureParent = async ({ fullName, phone, email, cnic, occupation, address }) => {
  const existing = await prisma.parent.findFirst({
    where: {
      fullName,
      OR: [{ phone }, { email }],
    },
  });

  if (existing) {
    return prisma.parent.update({
      where: { id: existing.id },
      data: { phone, email, cnic, occupation, address, status: 'active' },
    });
  }

  return prisma.parent.create({
    data: {
      fullName,
      phone,
      email,
      cnic,
      occupation,
      address,
      status: 'active',
    },
  });
};

const ensureStudent = async ({
  admissionNumber,
  fullName,
  fatherName,
  gender,
  dob,
  phone,
  email,
  address,
}) => {
  const existing = await prisma.student.findUnique({
    where: { admissionNumber },
  });

  if (existing) {
    return prisma.student.update({
      where: { id: existing.id },
      data: { fullName, fatherName, gender, dob, phone, email, address, status: 'active' },
    });
  }

  return prisma.student.create({
    data: {
      admissionNumber,
      fullName,
      fatherName,
      gender,
      dob,
      phone,
      email,
      address,
      status: 'active',
    },
  });
};

const ensureStudentParentLink = async (studentId, parentId, relationship, isPrimary) => {
  await prisma.studentParent.upsert({
    where: {
      studentId_parentId_relationship: {
        studentId,
        parentId,
        relationship,
      },
    },
    update: {
      isPrimary,
    },
    create: {
      studentId,
      parentId,
      relationship,
      isPrimary,
    },
  });
};

const ensureAssignment = async (studentId, branchId, classId, sectionId, sessionId) => {
  const existingActive = await prisma.studentClassAssignment.findFirst({
    where: {
      studentId,
      branchId,
      classId,
      sectionId,
      sessionId,
      status: 'active',
    },
  });

  if (existingActive) {
    return existingActive;
  }

  await prisma.studentClassAssignment.updateMany({
    where: {
      studentId,
      status: 'active',
    },
    data: {
      status: 'inactive',
    },
  });

  return prisma.studentClassAssignment.create({
    data: {
      studentId,
      branchId,
      classId,
      sectionId,
      sessionId,
      status: 'active',
    },
  });
};

const ensureTeacher = async ({
  fullName,
  email,
  phone,
  cnic,
  subject,
  qualification,
  address,
  basicSalary,
}) => {
  const existing = await prisma.teacher.findFirst({
    where: {
      OR: [{ phone }, { cnic }],
    },
  });

  if (existing) {
    return prisma.teacher.update({
      where: { id: existing.id },
      data: {
        fullName,
        email,
        phone,
        cnic,
        subject,
        qualification,
        address,
        basicSalary: toDecimal(basicSalary),
        status: 'active',
      },
    });
  }

  return prisma.teacher.create({
    data: {
      fullName,
      email,
      phone,
      cnic,
      subject,
      qualification,
      address,
      basicSalary: toDecimal(basicSalary),
      status: 'active',
    },
  });
};

const ensureFinanceHead = async ({ name, type, description }) => {
  const existing = await prisma.financeHead.findUnique({
    where: { name },
  });

  if (existing) {
    return prisma.financeHead.update({
      where: { id: existing.id },
      data: { type, description, status: 'active' },
    });
  }

  return prisma.financeHead.create({
    data: { name, type, description, status: 'active' },
  });
};

const ensureStudentAttendance = (studentId, branchId, classId, sectionId) =>
  prisma.studentAttendance.upsert({
    where: {
      studentId_date: {
        studentId,
        date: sampleDates.studentAttendance,
      },
    },
    update: {
      branchId,
      classId,
      sectionId,
      status: 'Present',
      remarks: 'Seeded attendance entry',
    },
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
    where: {
      teacherId_date: {
        teacherId,
        date: sampleDates.teacherAttendance,
      },
    },
    update: {
      branchId,
      status: 'Present',
      remarks: 'Seeded teacher attendance',
    },
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
    where: {
      studentId_date: {
        studentId,
        date: sampleDates.hifzDaily,
      },
    },
    update: {
      sabq: 'Surah Baqarah Ruku 1',
      sabaqi: 'Surah Fatiha',
      manzil: 'Juz 1',
      performanceStatus: 'Good',
      remarks: 'Seeded daily hifz entry',
      status: 'active',
    },
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
    update: {
      siparaFrom: '1',
      siparaTo: '2',
      lessonFrom: 'Ayat 1',
      lessonTo: 'Ayat 20',
      performanceStatus: 'Good',
      remarks: 'Seeded weekly hifz entry',
      status: 'active',
    },
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
    where: {
      studentId_month_year: {
        studentId,
        month: 5,
        year: 2026,
      },
    },
    update: {
      startSabq: 'Sipara 1',
      endSabq: 'Sipara 2',
      totalRecitation: '2 Siparay',
      performanceStatus: 'Good',
      remarks: 'Seeded monthly hifz entry',
      status: 'active',
    },
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
    where: {
      studentId_siparaNumber: {
        studentId,
        siparaNumber: 1,
      },
    },
    update: {
      startDate: sampleDates.siparaStart,
      endDate: sampleDates.siparaEnd,
      totalDays: 15,
      quality: 'Strong retention',
      performanceStatus: 'Excellent',
      remarks: 'Seeded sipara entry',
      status: 'active',
    },
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

const ensureFundCollection = async (studentId, financeHeadId) => {
  const existing = await prisma.fundCollection.findFirst({
    where: {
      studentId,
      financeHeadId,
      paymentDate: sampleDates.fundPayment,
    },
  });

  if (existing) {
    return prisma.fundCollection.update({
      where: { id: existing.id },
      data: {
        amount: toDecimal(3500),
        remarks: 'Seeded monthly fee collection',
        status: 'active',
      },
    });
  }

  return prisma.fundCollection.create({
    data: {
      studentId,
      financeHeadId,
      amount: toDecimal(3500),
      paymentDate: sampleDates.fundPayment,
      remarks: 'Seeded monthly fee collection',
      status: 'active',
    },
  });
};

const ensureSalaryEntry = async (teacherId, financeHeadId) => {
  const existing = await prisma.salaryEntry.findFirst({
    where: {
      teacherId,
      salaryMonth: 5,
      salaryYear: 2026,
    },
  });

  if (existing) {
    return prisma.salaryEntry.update({
      where: { id: existing.id },
      data: {
        financeHeadId,
        amount: toDecimal(25000),
        paymentDate: sampleDates.salaryPayment,
        remarks: 'Seeded salary payment',
        status: 'active',
      },
    });
  }

  return prisma.salaryEntry.create({
    data: {
      teacherId,
      financeHeadId,
      amount: toDecimal(25000),
      salaryMonth: 5,
      salaryYear: 2026,
      paymentDate: sampleDates.salaryPayment,
      remarks: 'Seeded salary payment',
      status: 'active',
    },
  });
};

const countSnapshot = async () => ({
  admins: await prisma.admin.count(),
  madrassaProfiles: await prisma.madrassaProfile.count(),
  cities: await prisma.city.count(),
  branches: await prisma.branch.count(),
  classes: await prisma.academicClass.count(),
  sections: await prisma.section.count(),
  sessions: await prisma.academicSession.count(),
  students: await prisma.student.count(),
  parents: await prisma.parent.count(),
  studentParents: await prisma.studentParent.count(),
  assignments: await prisma.studentClassAssignment.count(),
  teachers: await prisma.teacher.count(),
  studentAttendance: await prisma.studentAttendance.count(),
  teacherAttendance: await prisma.teacherAttendance.count(),
  hifzDaily: await prisma.hifzDailyEntry.count(),
  hifzWeekly: await prisma.hifzWeeklyEntry.count(),
  hifzMonthly: await prisma.hifzMonthlyEntry.count(),
  hifzSipara: await prisma.hifzSiparaEntry.count(),
  financeHeads: await prisma.financeHead.count(),
  fundCollections: await prisma.fundCollection.count(),
  salaryEntries: await prisma.salaryEntry.count(),
});

const main = async () => {
  const admin = await ensureAdmin();
  await ensureMadrassaProfile(admin.id, admin.email);
  await ensureCity('Lahore');
  await ensureCity('Karachi');
  const branch = await ensureBranch();
  const academicClass = await ensureClass(branch.id);
  const section = await ensureSection(academicClass.id);
  const session = await ensureSession();

  const father = await ensureParent({
    fullName: 'Muhammad Aslam',
    phone: '03001234567',
    email: 'aslam.parent@example.com',
    cnic: '35202-1234567-1',
    occupation: 'Businessman',
    address: 'Township, Lahore',
  });

  const mother = await ensureParent({
    fullName: 'Ayesha Aslam',
    phone: '03007654321',
    email: 'ayesha.parent@example.com',
    cnic: '35202-7654321-9',
    occupation: 'Teacher',
    address: 'Township, Lahore',
  });

  const student1 = await ensureStudent({
    admissionNumber: 'STD-1001',
    fullName: 'Abdullah Aslam',
    fatherName: 'Muhammad Aslam',
    gender: 'male',
    dob: new Date('2014-03-12T00:00:00.000Z'),
    phone: '03111222333',
    email: 'abdullah.student@example.com',
    address: 'Township, Lahore',
  });

  const student2 = await ensureStudent({
    admissionNumber: 'STD-1002',
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

  await ensureAssignment(student1.id, branch.id, academicClass.id, section.id, session.id);
  await ensureAssignment(student2.id, branch.id, academicClass.id, section.id, session.id);

  const teacher = await ensureTeacher({
    fullName: 'Qari Ibrahim',
    email: 'ibrahim.teacher@example.com',
    phone: '03211234567',
    cnic: '35201-1234567-8',
    subject: 'Hifz',
    qualification: 'Shahadat ul Aalmiya',
    address: 'Model Town, Lahore',
    basicSalary: 25000,
  });

  await ensureTeacher({
    fullName: 'Ustani Maryam',
    email: 'maryam.teacher@example.com',
    phone: '03217654321',
    cnic: '35201-7654321-0',
    subject: 'Nazra',
    qualification: 'MA Islamiat',
    address: 'Wapda Town, Lahore',
    basicSalary: 22000,
  });

  const incomeHead = await ensureFinanceHead({
    name: 'Monthly Fee',
    type: 'income',
    description: 'Student monthly fee collection',
  });

  const expenseHead = await ensureFinanceHead({
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
  await ensureFundCollection(student1.id, incomeHead.id);
  await ensureSalaryEntry(teacher.id, expenseHead.id);

  const summary = await countSnapshot();

  console.log(
    JSON.stringify(
      {
        message: 'Seed completed successfully.',
        admin: {
          username: adminSeed.username,
          email: adminSeed.email,
          password: adminSeed.password,
        },
        ids: {
          adminId: admin.id,
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
