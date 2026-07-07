import { prisma } from '../src/config/prisma.js';

const roles = [
  {
    roleName: 'super_admin',
    description: 'Full system access with all role and permission management rights.',
  },
  {
    roleName: 'admin',
    description: 'General madarsa administration role.',
  },
  {
    roleName: 'accountant',
    description: 'Finance, fees, salary, and reports access.',
  },
  {
    roleName: 'receptionist',
    description: 'Front desk admissions and visitor handling role.',
  },
  {
    roleName: 'read_only',
    description: 'Read-only access for allowed pages.',
  },
  {
    roleName: 'teacher',
    description: 'Limited teaching, attendance, hifz, and exam access.',
  },
  {
    roleName: 'store_manager',
    description: 'Store management access.',
  },
  {
    roleName: 'viewer',
    description: 'Read-only access for allowed pages.',
  },
];

const permissions = [
  { key: 'dashboard.view', name: 'ڈیش بورڈ دیکھیں', path: '/dashboard', module: 'dashboard' },

  { key: 'role_management.view', name: 'رول مینجمنٹ دیکھیں', path: '/role-management', module: 'role_management' },
  { key: 'roles.view', name: 'رولز دیکھیں', path: '/role-management', module: 'role_management' },
  { key: 'roles.create', name: 'نیا رول شامل کریں', path: '/role-management', module: 'role_management' },
  { key: 'roles.edit', name: 'رول تبدیل کریں', path: '/role-management', module: 'role_management' },
  { key: 'roles.delete', name: 'رول حذف کریں', path: '/role-management', module: 'role_management' },
  { key: 'users.view', name: 'صارفین دیکھیں', path: '/role-management/users', module: 'users' },
  { key: 'users.create', name: 'نیا صارف شامل کریں', path: '/role-management/users', module: 'users' },
  { key: 'users.edit', name: 'صارف تبدیل کریں', path: '/role-management/users', module: 'users' },
  { key: 'users.delete', name: 'صارف حذف کریں', path: '/role-management/users', module: 'users' },
  { key: 'users.reset_password', name: 'صارف کا پاس ورڈ ری سیٹ کریں', path: '/role-management/users', module: 'users' },

  { key: 'class_management.view', name: 'کلاس مینجمنٹ دیکھیں', path: '/class-management/Classes', module: 'class_management' },
  { key: 'class_management.create', name: 'کلاس مینجمنٹ میں نیا ریکارڈ شامل کریں', path: '/class-management/Classes', module: 'class_management' },
  { key: 'class_management.edit', name: 'کلاس مینجمنٹ ریکارڈ تبدیل کریں', path: '/class-management/Classes', module: 'class_management' },
  { key: 'class_management.delete', name: 'کلاس مینجمنٹ ریکارڈ حذف کریں', path: '/class-management/Classes', module: 'class_management' },
  { key: 'classes.view', name: 'جماعتیں دیکھیں', path: '/class-management/Classes', module: 'classes' },
  { key: 'classes.create', name: 'نئی جماعت شامل کریں', path: '/class-management/Classes', module: 'classes' },
  { key: 'classes.edit', name: 'جماعت تبدیل کریں', path: '/class-management/Classes', module: 'classes' },
  { key: 'classes.delete', name: 'جماعت حذف کریں', path: '/class-management/Classes', module: 'classes' },
  { key: 'sections.view', name: 'سیکشنز دیکھیں', path: '/class-management/sections', module: 'sections' },
  { key: 'sections.create', name: 'نیا سیکشن شامل کریں', path: '/class-management/sections', module: 'sections' },
  { key: 'sections.edit', name: 'سیکشن تبدیل کریں', path: '/class-management/sections', module: 'sections' },
  { key: 'sections.delete', name: 'سیکشن حذف کریں', path: '/class-management/sections', module: 'sections' },
  { key: 'sessions.view', name: 'سیشن دیکھیں', path: '/class-management/session', module: 'sessions' },
  { key: 'sessions.create', name: 'نیا سیشن شامل کریں', path: '/class-management/session', module: 'sessions' },
  { key: 'sessions.edit', name: 'سیشن تبدیل کریں', path: '/class-management/session', module: 'sessions' },
  { key: 'sessions.delete', name: 'سیشن حذف کریں', path: '/class-management/session', module: 'sessions' },
  { key: 'subjects.view', name: 'مضامین دیکھیں', path: '/class-management/subjects', module: 'subjects' },
  { key: 'subjects.create', name: 'نیا مضمون شامل کریں', path: '/class-management/subjects', module: 'subjects' },
  { key: 'subjects.edit', name: 'مضمون تبدیل کریں', path: '/class-management/subjects', module: 'subjects' },
  { key: 'subjects.delete', name: 'مضمون حذف کریں', path: '/class-management/subjects', module: 'subjects' },

  { key: 'students.view', name: 'طلباء دیکھیں', path: '/students/list', module: 'students' },
  { key: 'students.create', name: 'نیا طالب علم شامل کریں', path: '/students/admission', module: 'students' },
  { key: 'students.edit', name: 'طالب علم تبدیل کریں', path: '/students/list', module: 'students' },
  { key: 'students.delete', name: 'طالب علم حذف کریں', path: '/students/list', module: 'students' },
  { key: 'students.profile.view', name: 'طالب علم پروفائل دیکھیں', path: '/students/profile/:id', module: 'students' },
  { key: 'students.id_card.view', name: 'آئی ڈی کارڈ دیکھیں', path: '/students/create-id-card', module: 'students' },
  { key: 'students.id_card.create', name: 'آئی ڈی کارڈ بنائیں', path: '/students/create-id-card', module: 'students' },
  { key: 'students.assign_class', name: 'طالب علم کو کلاس میں شامل کریں', path: '/students/class_asign', module: 'students' },
  { key: 'students.schedule.view', name: 'طلباء شیڈول دیکھیں', path: '/students/schedule', module: 'students' },
  { key: 'students.schedule.create', name: 'طلباء شیڈول بنائیں', path: '/students/schedule', module: 'students' },
  { key: 'students.schedule.edit', name: 'طلباء شیڈول تبدیل کریں', path: '/students/schedule', module: 'students' },

  { key: 'parents.view', name: 'والدین دیکھیں', path: '/students/parents', module: 'parents' },
  { key: 'parents.create', name: 'والدین شامل کریں', path: '/students/parents', module: 'parents' },
  { key: 'parents.edit', name: 'والدین تبدیل کریں', path: '/students/parents', module: 'parents' },
  { key: 'parents.delete', name: 'والدین حذف کریں', path: '/students/parents', module: 'parents' },

  { key: 'attendance.view', name: 'حاضری دیکھیں', path: '/students/attendance', module: 'attendance' },
  { key: 'attendance.create', name: 'حاضری لگائیں', path: '/students/attendance', module: 'attendance' },
  { key: 'attendance.edit', name: 'حاضری تبدیل کریں', path: '/students/attendance', module: 'attendance' },
  { key: 'attendance.delete', name: 'حاضری حذف کریں', path: '/students/attendance', module: 'attendance' },
  { key: 'attendance.history.view', name: 'حاضری تاریخ دیکھیں', path: '/students/attendance-history/:id', module: 'attendance' },

  { key: 'teachers.view', name: 'اساتذہ دیکھیں', path: '/teachers/list', module: 'teachers' },
  { key: 'teachers.create', name: 'نیا استاد شامل کریں', path: '/HRManagement', module: 'teachers' },
  { key: 'teachers.edit', name: 'استاد تبدیل کریں', path: '/teachers/list', module: 'teachers' },
  { key: 'teachers.delete', name: 'استاد حذف کریں', path: '/teachers/list', module: 'teachers' },
  { key: 'teachers.details.view', name: 'استاد کی تفصیل دیکھیں', path: '/teachers/details/:id', module: 'teachers' },
  { key: 'teachers.attendance.view', name: 'اساتذہ حاضری دیکھیں', path: '/teachers/attendance', module: 'teachers' },
  { key: 'teachers.attendance.create', name: 'اساتذہ حاضری لگائیں', path: '/teachers/attendance', module: 'teachers' },
  { key: 'teachers.schedule.view', name: 'اساتذہ شیڈول دیکھیں', path: '/teachers/schedule', module: 'teachers' },
  { key: 'teachers.schedule.create', name: 'اساتذہ شیڈول بنائیں', path: '/teachers/schedule', module: 'teachers' },
  { key: 'teachers.salary_increments.view', name: 'تنخواہ انکریمنٹ دیکھیں', path: '/teachers/salary-increments', module: 'teachers' },
  { key: 'teachers.salary_increments.create', name: 'تنخواہ انکریمنٹ شامل کریں', path: '/teachers/salary-increments', module: 'teachers' },

  { key: 'staff.view', name: 'عملہ دیکھیں', path: '/staff/list', module: 'staff' },
  { key: 'staff.create', name: 'نیا عملہ شامل کریں', path: '/HRManagement?staffType=staff', module: 'staff' },
  { key: 'staff.edit', name: 'عملہ تبدیل کریں', path: '/staff/list', module: 'staff' },
  { key: 'staff.delete', name: 'عملہ حذف کریں', path: '/staff/list', module: 'staff' },

  { key: 'fees.view', name: 'فیس دیکھیں', path: '/students/fees', module: 'fees' },
  { key: 'fees.create', name: 'فیس جنریٹ کریں', path: '/students/fees', module: 'fees' },
  { key: 'fees.edit', name: 'فیس تبدیل کریں', path: '/students/fees', module: 'fees' },
  { key: 'fees.delete', name: 'فیس حذف کریں', path: '/students/fees', module: 'fees' },
  { key: 'fees.details.view', name: 'فیس تفصیل دیکھیں', path: '/students/details/:id', module: 'fees' },

  { key: 'funds.view', name: 'فنڈز دیکھیں', path: '/finance/income/fund-list', module: 'funds' },
  { key: 'funds.create', name: 'فنڈ وصولی شامل کریں', path: '/finance/income/fund-collection', module: 'funds' },
  { key: 'funds.edit', name: 'فنڈ وصولی تبدیل کریں', path: '/finance/income/fund-list', module: 'funds' },
  { key: 'funds.delete', name: 'فنڈ وصولی حذف کریں', path: '/finance/income/fund-list', module: 'funds' },

  { key: 'finance.view', name: 'مالیات دیکھیں', path: '/finance', module: 'finance' },
  { key: 'finance.create', name: 'مالی ریکارڈ شامل کریں', path: '/finance', module: 'finance' },
  { key: 'finance.edit', name: 'مالی ریکارڈ تبدیل کریں', path: '/finance', module: 'finance' },
  { key: 'finance.delete', name: 'مالی ریکارڈ حذف کریں', path: '/finance', module: 'finance' },
  { key: 'finance.heads.view', name: 'آمدن و خرچ سیٹ اَپ دیکھیں', path: '/finance/setup/income-expence', module: 'finance' },
  { key: 'finance.heads.edit', name: 'آمدن و خرچ سیٹ اَپ تبدیل کریں', path: '/finance/setup/income-expence', module: 'finance' },
  { key: 'finance.transactions.view', name: 'دیگر آمدن و خرچ دیکھیں', path: '/finance/other-income-expense', module: 'finance' },
  { key: 'finance.transactions.create', name: 'دیگر آمدن و خرچ شامل کریں', path: '/finance/other-income-expense', module: 'finance' },
  { key: 'finance.reports.view', name: 'مالی رپورٹس دیکھیں', path: '/finance/reports/financial-statements', module: 'reports' },

  { key: 'salary.view', name: 'تنخواہ دیکھیں', path: '/finance/expenses/payroll', module: 'salary' },
  { key: 'salary.create', name: 'تنخواہ ادا کریں', path: '/finance/expenses/payroll', module: 'salary' },
  { key: 'salary.edit', name: 'تنخواہ تبدیل کریں', path: '/finance/expenses/payroll', module: 'salary' },
  { key: 'salary.delete', name: 'تنخواہ حذف کریں', path: '/finance/expenses/payroll', module: 'salary' },

  { key: 'hifz.view', name: 'حفظ دیکھیں', path: '/hifz', module: 'hifz' },
  { key: 'hifz.create', name: 'حفظ ریکارڈ شامل کریں', path: '/hifz', module: 'hifz' },
  { key: 'hifz.edit', name: 'حفظ ریکارڈ تبدیل کریں', path: '/hifz', module: 'hifz' },
  { key: 'hifz.delete', name: 'حفظ ریکارڈ حذف کریں', path: '/hifz', module: 'hifz' },
  { key: 'hifz.daily.view', name: 'یومیہ جائزہ دیکھیں', path: '/hifz/daily/list', module: 'hifz' },
  { key: 'hifz.daily.create', name: 'یومیہ جائزہ درج کریں', path: '/hifz/daily/entry', module: 'hifz' },
  { key: 'hifz.weekly.view', name: 'ہفتہ وار جائزہ دیکھیں', path: '/hifz/weekly/list', module: 'hifz' },
  { key: 'hifz.weekly.create', name: 'ہفتہ وار جائزہ درج کریں', path: '/hifz/weekly/entry', module: 'hifz' },
  { key: 'hifz.monthly.view', name: 'ماہانہ جائزہ دیکھیں', path: '/hifz/monthly/list', module: 'hifz' },
  { key: 'hifz.monthly.create', name: 'ماہانہ جائزہ درج کریں', path: '/hifz/monthly/entry', module: 'hifz' },
  { key: 'hifz.para.view', name: 'پارہ جائزہ دیکھیں', path: '/hifz/para/list', module: 'hifz' },
  { key: 'hifz.para.create', name: 'پارہ جائزہ درج کریں', path: '/hifz/para/entry', module: 'hifz' },

  { key: 'exams.view', name: 'امتحانات دیکھیں', path: '/exams/schedule-list', module: 'exams' },
  { key: 'exams.create', name: 'امتحان شامل کریں', path: '/exams/schedule', module: 'exams' },
  { key: 'exams.edit', name: 'امتحان تبدیل کریں', path: '/exams/schedule-list', module: 'exams' },
  { key: 'exams.delete', name: 'امتحان حذف کریں', path: '/exams/schedule-list', module: 'exams' },
  { key: 'exam_results.view', name: 'امتحانی نتائج دیکھیں', path: '/exams/result-list', module: 'exams' },
  { key: 'exam_results.create', name: 'امتحانی نتیجہ شامل کریں', path: '/exams/result', module: 'exams' },
  { key: 'exam_results.edit', name: 'امتحانی نتیجہ تبدیل کریں', path: '/exams/result-list', module: 'exams' },
  { key: 'result_grades.view', name: 'رزلٹ فیصد رینج دیکھیں', path: '/exams/result-grades', module: 'exams' },
  { key: 'result_grades.edit', name: 'رزلٹ فیصد رینج تبدیل کریں', path: '/exams/result-grades', module: 'exams' },

  { key: 'store.view', name: 'اسٹور دیکھیں', path: '/store/dashboard', module: 'store' },
  { key: 'store.create', name: 'اسٹور ریکارڈ شامل کریں', path: '/store', module: 'store' },
  { key: 'store.edit', name: 'اسٹور ریکارڈ تبدیل کریں', path: '/store', module: 'store' },
  { key: 'store.delete', name: 'اسٹور ریکارڈ حذف کریں', path: '/store', module: 'store' },
  { key: 'store.approve', name: 'اسٹور منظوری دیں', path: '/store/approvals', module: 'store' },
  { key: 'store.reports', name: 'اسٹور رپورٹس دیکھیں', path: '/store/reports', module: 'store' },
  { key: 'store.export', name: 'اسٹور رپورٹ ایکسپورٹ کریں', path: '/store/reports', module: 'store' },
  { key: 'store.items.view', name: 'اسٹور اشیاء دیکھیں', path: '/store/items', module: 'store' },
  { key: 'store.items.create', name: 'اسٹور شے شامل کریں', path: '/store/items', module: 'store' },
  { key: 'store.units.view', name: 'اسٹور اکائیاں دیکھیں', path: '/store/units', module: 'store' },
  { key: 'store.categories.view', name: 'اسٹور کیٹیگریز دیکھیں', path: '/store/categories', module: 'store' },
  { key: 'store.purchases.view', name: 'اسٹور خریداری دیکھیں', path: '/store/purchases', module: 'store' },
  { key: 'store.purchases.create', name: 'اسٹور خریداری شامل کریں', path: '/store/purchases', module: 'store' },
  { key: 'store.stock_issues.view', name: 'اسٹاک اجراء دیکھیں', path: '/store/stock-issues', module: 'store' },
  { key: 'store.stock_issues.create', name: 'اسٹاک اجراء شامل کریں', path: '/store/stock-issues', module: 'store' },
  { key: 'store.returns.view', name: 'اسٹور واپسی دیکھیں', path: '/store/returns', module: 'store' },
  { key: 'store.damaged_stock.view', name: 'خراب یا گم شدہ اسٹاک دیکھیں', path: '/store/damaged-stock', module: 'store' },
  { key: 'store.suppliers.view', name: 'سپلائرز دیکھیں', path: '/store/suppliers', module: 'store' },
  { key: 'store.suppliers.create', name: 'سپلائر شامل کریں', path: '/store/suppliers', module: 'store' },

  { key: 'settings.view', name: 'ترتیبات دیکھیں', path: '/setting/shift', module: 'settings' },
  { key: 'settings.edit', name: 'ترتیبات تبدیل کریں', path: '/setting/shift', module: 'settings' },
  { key: 'settings.shifts.view', name: 'شفٹ کا انتظام دیکھیں', path: '/setting/shift', module: 'settings' },
  { key: 'settings.departments.view', name: 'شعبہ جات کا انتظام دیکھیں', path: '/setting/department', module: 'settings' },
  { key: 'settings.degrees.view', name: 'تعلیمی اسناد کے نام دیکھیں', path: '/setting/degree-name', module: 'settings' },
  { key: 'settings.cities.view', name: 'شہر دیکھیں', path: '/Profile/cities', module: 'settings' },
  { key: 'settings.cities.create', name: 'شہر شامل کریں', path: '/Profile/cities', module: 'settings' },
  { key: 'settings.cities.edit', name: 'شہر تبدیل کریں', path: '/Profile/cities', module: 'settings' },

  { key: 'profile.view', name: 'پروفائل دیکھیں', path: '/Profile/setting', module: 'profile' },
  { key: 'profile.edit', name: 'پروفائل تبدیل کریں', path: '/Profile/setting', module: 'profile' },
  { key: 'profile.change_password', name: 'پاس ورڈ تبدیل کریں', path: '/Profile/change-password', module: 'profile' },
  { key: 'support.view', name: 'سپورٹ دیکھیں', path: '/Profile/support', module: 'support' },
  { key: 'support.create', name: 'سپورٹ درخواست بھیجیں', path: '/Profile/support', module: 'support' },
  { key: 'suggestions.view', name: 'تجاویز دیکھیں', path: '/Profile/suggestions', module: 'suggestions' },
  { key: 'suggestions.create', name: 'تجویز بھیجیں', path: '/Profile/suggestions', module: 'suggestions' },

  { key: 'reports.view', name: 'رپورٹس دیکھیں', path: '/finance/reports/financial-statements', module: 'reports' },
];

const getFirstAdminId = async () => {
  const admins = await prisma.$queryRaw`SELECT id FROM admins ORDER BY id LIMIT 1`;
  return admins[0]?.id || null;
};

const seedRoles = async (createdBy) => {
  for (const role of roles) {
    const existing = await prisma.$queryRaw`
      SELECT id
      FROM roles
      WHERE tenant_id IS NULL
        AND role_name = ${role.roleName}
      LIMIT 1
    `;

    if (existing[0]) {
      await prisma.$executeRaw`
        UPDATE roles
        SET description = ${role.description},
            status = 'active',
            is_system_role = true,
            updated_by = ${createdBy},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${Number(existing[0].id)}
      `;
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO roles (tenant_id, role_name, description, status, is_system_role, created_by, updated_by)
      VALUES (NULL, ${role.roleName}, ${role.description}, 'active', true, ${createdBy}, ${createdBy})
    `;
  }
};

const seedPermissions = async () => {
  for (const permission of permissions) {
    await prisma.$executeRaw`
      INSERT INTO permissions (permission_key, permission_name, page_path, module_name)
      VALUES (${permission.key}, ${permission.name}, ${permission.path}, ${permission.module})
      ON DUPLICATE KEY UPDATE
        permission_name = VALUES(permission_name),
        page_path = VALUES(page_path),
        module_name = VALUES(module_name)
    `;
  }
};

const assignSuperAdminPermissions = async () => {
  await prisma.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT roles.tenant_id, roles.id, permissions.id
    FROM roles
    CROSS JOIN permissions
    WHERE roles.tenant_id IS NULL
      AND roles.role_name = 'super_admin'
  `;
};

const assignExistingAdmins = async () => {
  await prisma.$executeRaw`
    UPDATE admins
    SET role_id = (SELECT id FROM roles WHERE tenant_id IS NULL AND role_name = 'super_admin' LIMIT 1)
    WHERE role_id IS NULL
  `;
};

const main = async () => {
  const createdBy = await getFirstAdminId();

  await seedRoles(createdBy);
  await seedPermissions();
  await assignSuperAdminPermissions();
  await assignExistingAdmins();

  console.log(
    JSON.stringify(
      {
        message: 'Role permissions seeded successfully.',
        roles: roles.length,
        permissions: permissions.length,
        superAdminPermissions: 'all',
      },
      null,
      2,
    ),
  );
};

main()
  .catch((error) => {
    console.error('Role permission seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
