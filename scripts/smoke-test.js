const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5002';

const credentials = {
  identity: 'admin',
  password: 'Admin@12345',
};

const tests = [];

const expectSuccess = async (name, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  const passed = response.ok && body?.success !== false;
  tests.push({
    name,
    method: options.method || 'GET',
    path,
    status: response.status,
    passed,
    message: body?.message || null,
  });

  if (!passed) {
    const error = new Error(`${name} failed with status ${response.status}`);
    error.responseBody = body;
    throw error;
  }

  return body;
};

const makeAuthHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const main = async () => {
  const health = await expectSuccess('Health check', '/api/health');
  const login = await expectSuccess('Admin login', '/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const token = login.data?.token;
  if (!token) {
    throw new Error('Login response did not include a token.');
  }

  await expectSuccess('Current admin profile', '/api/auth/me', {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Madrassa profile fetch', '/api/auth/profile', {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Madrassa profile update', '/api/auth/profile', {
    method: 'PUT',
    headers: {
      ...makeAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Jamia Anwar ul Quran',
      email: 'admin@madarsa.local',
      phone1: '0300-1234567',
      phone2: '0321-7654321',
      address: 'Township, Lahore',
      branch: 'Main Campus',
      city: 'Lahore',
      familyNoSeq: 'FAM-2026-001',
      regNo: 'REG-QA-9921',
      logoUrl: '',
      status: 'active',
    }),
  });

  const branches = await expectSuccess('Branches list', '/api/branches', {
    headers: makeAuthHeaders(token),
  });
  const branchId = branches.data?.items?.[0]?.id;

  const classes = await expectSuccess('Classes list', '/api/classes', {
    headers: makeAuthHeaders(token),
  });
  const classId = classes.data?.items?.[0]?.id;

  const sections = await expectSuccess('Sections list', '/api/sections', {
    headers: makeAuthHeaders(token),
  });
  const sectionId = sections.data?.items?.[0]?.id;

  const sessions = await expectSuccess('Sessions list', '/api/sessions', {
    headers: makeAuthHeaders(token),
  });
  const sessionId = sessions.data?.items?.[0]?.id;

  const subjectName = `Smoke Subject ${Date.now()}`;
  const createdSubject = await expectSuccess('Subject create', '/api/subjects', {
    method: 'POST',
    headers: {
      ...makeAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: subjectName,
      detail: 'Smoke test subject',
    }),
  });
  const subjectId = createdSubject.data?.id;

  const students = await expectSuccess('Students list', '/api/students', {
    headers: makeAuthHeaders(token),
  });
  const studentId =
    students.data?.items?.find((item) => item.admissionNumber === 'STD-1001')?.id ||
    students.data?.items?.[0]?.id;

  const parents = await expectSuccess('Parents list', '/api/parents', {
    headers: makeAuthHeaders(token),
  });
  const parentId = parents.data?.items?.[0]?.id;

  const teachers = await expectSuccess('Teachers list', '/api/teachers', {
    headers: makeAuthHeaders(token),
  });
  const teacherId =
    teachers.data?.items?.find((item) => item.fullName === 'Qari Ibrahim')?.id ||
    teachers.data?.items?.[0]?.id;

  const financeHeads = await expectSuccess('Finance heads list', '/api/finance/heads', {
    headers: makeAuthHeaders(token),
  });
  const headId = financeHeads.data?.items?.[0]?.id;

  const fundCollections = await expectSuccess('Fund collections list', '/api/finance/fund-collections', {
    headers: makeAuthHeaders(token),
  });
  const fundCollectionId = fundCollections.data?.items?.[0]?.id;

  const salaryEntries = await expectSuccess('Salary entries list', '/api/finance/salaries', {
    headers: makeAuthHeaders(token),
  });
  const salaryId = salaryEntries.data?.items?.[0]?.id;

  await expectSuccess('Branch detail', `/api/branches/${branchId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Class detail', `/api/classes/${classId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Section detail', `/api/sections/${sectionId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Session detail', `/api/sessions/${sessionId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Subject detail', `/api/subjects/${subjectId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Student detail', `/api/students/${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Parent detail', `/api/parents/${parentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Teacher detail', `/api/teachers/${teacherId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Finance head detail', `/api/finance/heads/${headId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Fund collection detail', `/api/finance/fund-collections/${fundCollectionId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Salary detail', `/api/finance/salaries/${salaryId}`, {
    headers: makeAuthHeaders(token),
  });

  await expectSuccess('Student attendance list', `/api/attendance/students?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Teacher attendance list', `/api/attendance/teachers?teacherId=${teacherId}`, {
    headers: makeAuthHeaders(token),
  });

  const daily = await expectSuccess('Hifz daily list', `/api/hifz/daily?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  const dailyId = daily.data?.items?.[0]?.id;

  const weekly = await expectSuccess('Hifz weekly list', `/api/hifz/weekly?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  const weeklyId = weekly.data?.items?.[0]?.id;

  const monthly = await expectSuccess('Hifz monthly list', `/api/hifz/monthly?studentId=${studentId}&month=5&year=2026`, {
    headers: makeAuthHeaders(token),
  });
  const monthlyId = monthly.data?.items?.[0]?.id;

  const sipara = await expectSuccess('Hifz sipara list', `/api/hifz/sipara?studentId=${studentId}&siparaNumber=1`, {
    headers: makeAuthHeaders(token),
  });
  const siparaId = sipara.data?.items?.[0]?.id;

  await expectSuccess('Hifz daily detail', `/api/hifz/daily/${dailyId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Hifz weekly detail', `/api/hifz/weekly/${weeklyId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Hifz monthly detail', `/api/hifz/monthly/${monthlyId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Hifz sipara detail', `/api/hifz/sipara/${siparaId}`, {
    headers: makeAuthHeaders(token),
  });

  await expectSuccess('Subject update', `/api/subjects/${subjectId}`, {
    method: 'PATCH',
    headers: {
      ...makeAuthHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${subjectName} Updated`,
      detail: 'Smoke test subject updated',
    }),
  });
  await expectSuccess('Subject deactivate', `/api/subjects/${subjectId}/deactivate`, {
    method: 'PATCH',
    headers: makeAuthHeaders(token),
  });

  await expectSuccess('Finance summary report', '/api/finance/reports', {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Student fund history report', `/api/finance/reports/student-funds?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Teacher salary history report', `/api/finance/reports/teacher-salaries?teacherId=${teacherId}`, {
    headers: makeAuthHeaders(token),
  });

  await expectSuccess('Students report', '/api/reports/students', {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Attendance report', '/api/reports/attendance', {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Hifz progress report', `/api/reports/hifz-progress?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Fund collections report', `/api/reports/fund-collections?studentId=${studentId}`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Salaries report', `/api/reports/salaries?teacherId=${teacherId}&salaryMonth=5&salaryYear=2026`, {
    headers: makeAuthHeaders(token),
  });
  await expectSuccess('Monthly finance summary report', '/api/reports/monthly-finance-summary', {
    headers: makeAuthHeaders(token),
  });

  console.log(
    JSON.stringify(
      {
        message: 'Smoke test completed successfully.',
        healthMessage: health.message,
        baseUrl,
        totalTests: tests.length,
        passed: tests.filter((item) => item.passed).length,
        results: tests,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        message: error.message,
        baseUrl,
        results: tests,
        responseBody: error.responseBody || null,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
