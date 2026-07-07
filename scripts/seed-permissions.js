import { prisma } from '../src/config/prisma.js';

const ACTIONS = [
  { key: 'view', label: 'View', description: 'Can view records and screens' },
  { key: 'create', label: 'Create', description: 'Can create new records' },
  { key: 'update', label: 'Update', description: 'Can update existing records' },
  { key: 'delete', label: 'Delete', description: 'Can delete records' },
  { key: 'export', label: 'Export', description: 'Can export records' },
  { key: 'approve', label: 'Approve', description: 'Can approve requests or workflows' },
  { key: 'assign', label: 'Assign', description: 'Can assign records or ownership' },
  { key: 'manage', label: 'Manage', description: 'Can manage the full module workflow' },
  { key: 'print', label: 'Print', description: 'Can print documents and records' },
  { key: 'upload', label: 'Upload', description: 'Can upload files or attachments' },
  { key: 'download', label: 'Download', description: 'Can download files or exports' },
  { key: 'restore', label: 'Restore', description: 'Can restore archived or removed records' },
  { key: 'archive', label: 'Archive', description: 'Can archive records' },
];

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'students', label: 'Students', path: '/students' },
  { key: 'parents', label: 'Parents', path: '/parents' },
  { key: 'teachers', label: 'Teachers', path: '/teachers' },
  { key: 'classes', label: 'Classes', path: '/classes' },
  { key: 'sections', label: 'Sections', path: '/sections' },
  { key: 'attendance', label: 'Attendance', path: '/attendance' },
  { key: 'fees', label: 'Fees', path: '/fees' },
  { key: 'finance', label: 'Finance', path: '/finance' },
  { key: 'hifz', label: 'Hifz', path: '/hifz' },
  { key: 'exams', label: 'Exams', path: '/exams' },
  { key: 'store', label: 'Store', path: '/store' },
  { key: 'inventory', label: 'Inventory', path: '/inventory' },
  { key: 'reports', label: 'Reports', path: '/reports' },
  { key: 'roles', label: 'Role Management', path: '/roles' },
  { key: 'users', label: 'User Management', path: '/users' },
  { key: 'settings', label: 'Settings', path: '/settings' },
  { key: 'madrassa_profile', label: 'Madrassa Profile', path: '/profile' },
  { key: 'notifications', label: 'Notifications', path: '/notifications' },
  { key: 'branches', label: 'Branches', path: '/branches' },
  { key: 'admissions', label: 'Admissions', path: '/admissions' },
];

const EXTRA_PERMISSIONS = [
  ['attendance.mark', 'Attendance', 'Mark Attendance', 'Can mark attendance', '/attendance', 'mark'],
  ['fees.collect', 'Fees', 'Collect Fees', 'Can collect student fees', '/fees', 'collect'],
  ['fees.refund', 'Fees', 'Refund Fees', 'Can process fee refunds', '/fees', 'refund'],
  ['roles.assign_permissions', 'Role Management', 'Assign Permissions', 'Can assign permissions to roles', '/roles', 'assign_permissions'],
  ['role_management.view', 'Role Management', 'View Role Management', 'Can view role management', '/roles', 'view'],
  ['profile.view', 'Madrassa Profile', 'View Profile', 'Can view madrassa profile', '/profile', 'view'],
  ['profile.edit', 'Madrassa Profile', 'Edit Profile', 'Can edit madrassa profile', '/profile', 'edit'],
  ['profile.change_password', 'Madrassa Profile', 'Change Password', 'Can change account password', '/profile', 'change_password'],
  ['sessions.view', 'Academic Sessions', 'View Sessions', 'Can view academic sessions', '/sessions', 'view'],
  ['sessions.create', 'Academic Sessions', 'Create Sessions', 'Can create academic sessions', '/sessions', 'create'],
  ['sessions.edit', 'Academic Sessions', 'Edit Sessions', 'Can edit academic sessions', '/sessions', 'edit'],
  ['sessions.delete', 'Academic Sessions', 'Delete Sessions', 'Can delete academic sessions', '/sessions', 'delete'],
  ['subjects.view', 'Subjects', 'View Subjects', 'Can view subjects', '/subjects', 'view'],
  ['subjects.create', 'Subjects', 'Create Subjects', 'Can create subjects', '/subjects', 'create'],
  ['subjects.edit', 'Subjects', 'Edit Subjects', 'Can edit subjects', '/subjects', 'edit'],
  ['subjects.delete', 'Subjects', 'Delete Subjects', 'Can delete subjects', '/subjects', 'delete'],
  ['students.profile.view', 'Students', 'View Student Profile', 'Can view student profile', '/students', 'profile.view'],
  ['students.id_card.view', 'Students', 'View Student ID Card', 'Can view student ID cards', '/students/id-cards', 'id_card.view'],
  ['students.id_card.create', 'Students', 'Create Student ID Card', 'Can create student ID cards', '/students/id-cards', 'id_card.create'],
  ['students.assign_class', 'Students', 'Assign Student Class', 'Can assign students to classes', '/students', 'assign_class'],
  ['students.schedule.view', 'Students', 'View Student Schedule', 'Can view student schedules', '/students/schedules', 'schedule.view'],
  ['students.schedule.create', 'Students', 'Create Student Schedule', 'Can create student schedules', '/students/schedules', 'schedule.create'],
  ['students.schedule.edit', 'Students', 'Edit Student Schedule', 'Can edit student schedules', '/students/schedules', 'schedule.edit'],
  ['teachers.details.view', 'Teachers', 'View Teacher Details', 'Can view teacher details', '/teachers', 'details.view'],
  ['teachers.attendance.view', 'Teachers', 'View Teacher Attendance', 'Can view teacher attendance', '/teachers/attendance', 'attendance.view'],
  ['teachers.attendance.create', 'Teachers', 'Create Teacher Attendance', 'Can create teacher attendance', '/teachers/attendance', 'attendance.create'],
  ['teachers.schedule.view', 'Teachers', 'View Teacher Schedule', 'Can view teacher schedules', '/teachers/schedules', 'schedule.view'],
  ['teachers.schedule.create', 'Teachers', 'Create Teacher Schedule', 'Can create teacher schedules', '/teachers/schedules', 'schedule.create'],
  ['teachers.salary_increments.view', 'Teachers', 'View Salary Increments', 'Can view teacher salary increments', '/teachers/salary-increments', 'salary_increments.view'],
  ['teachers.salary_increments.create', 'Teachers', 'Create Salary Increments', 'Can create teacher salary increments', '/teachers/salary-increments', 'salary_increments.create'],
  ['staff.view', 'Staff', 'View Staff', 'Can view staff records', '/staff', 'view'],
  ['staff.create', 'Staff', 'Create Staff', 'Can create staff records', '/staff', 'create'],
  ['staff.edit', 'Staff', 'Edit Staff', 'Can edit staff records', '/staff', 'edit'],
  ['staff.delete', 'Staff', 'Delete Staff', 'Can delete staff records', '/staff', 'delete'],
  ['fees.details.view', 'Fees', 'View Fee Details', 'Can view fee details', '/fees', 'details.view'],
  ['funds.view', 'Funds', 'View Funds', 'Can view fund collections', '/funds', 'view'],
  ['funds.create', 'Funds', 'Create Funds', 'Can create fund collections', '/funds', 'create'],
  ['funds.edit', 'Funds', 'Edit Funds', 'Can edit fund collections', '/funds', 'edit'],
  ['funds.delete', 'Funds', 'Delete Funds', 'Can delete fund collections', '/funds', 'delete'],
  ['finance.heads.view', 'Finance', 'View Finance Heads', 'Can view finance heads', '/finance/heads', 'heads.view'],
  ['finance.heads.edit', 'Finance', 'Edit Finance Heads', 'Can edit finance heads', '/finance/heads', 'heads.edit'],
  ['finance.transactions.view', 'Finance', 'View Transactions', 'Can view finance transactions', '/finance/transactions', 'transactions.view'],
  ['finance.transactions.create', 'Finance', 'Create Transactions', 'Can create finance transactions', '/finance/transactions', 'transactions.create'],
  ['finance.reports.view', 'Finance', 'View Finance Reports', 'Can view finance reports', '/finance/reports', 'reports.view'],
  ['salary.view', 'Salary', 'View Salary', 'Can view salary records', '/salary', 'view'],
  ['salary.create', 'Salary', 'Create Salary', 'Can create salary records', '/salary', 'create'],
  ['salary.edit', 'Salary', 'Edit Salary', 'Can edit salary records', '/salary', 'edit'],
  ['salary.delete', 'Salary', 'Delete Salary', 'Can delete salary records', '/salary', 'delete'],
  ['hifz.daily.view', 'Hifz', 'View Daily Hifz', 'Can view daily hifz records', '/hifz/daily', 'daily.view'],
  ['hifz.daily.create', 'Hifz', 'Create Daily Hifz', 'Can create daily hifz records', '/hifz/daily', 'daily.create'],
  ['hifz.weekly.view', 'Hifz', 'View Weekly Hifz', 'Can view weekly hifz records', '/hifz/weekly', 'weekly.view'],
  ['hifz.weekly.create', 'Hifz', 'Create Weekly Hifz', 'Can create weekly hifz records', '/hifz/weekly', 'weekly.create'],
  ['hifz.monthly.view', 'Hifz', 'View Monthly Hifz', 'Can view monthly hifz records', '/hifz/monthly', 'monthly.view'],
  ['hifz.monthly.create', 'Hifz', 'Create Monthly Hifz', 'Can create monthly hifz records', '/hifz/monthly', 'monthly.create'],
  ['hifz.para.view', 'Hifz', 'View Para Records', 'Can view para records', '/hifz/para', 'para.view'],
  ['hifz.para.create', 'Hifz', 'Create Para Records', 'Can create para records', '/hifz/para', 'para.create'],
  ['exam_results.view', 'Exam Results', 'View Exam Results', 'Can view exam results', '/exam-results', 'view'],
  ['exam_results.create', 'Exam Results', 'Create Exam Results', 'Can create exam results', '/exam-results', 'create'],
  ['exam_results.edit', 'Exam Results', 'Edit Exam Results', 'Can edit exam results', '/exam-results', 'edit'],
  ['result_grades.view', 'Result Grades', 'View Result Grades', 'Can view result grades', '/result-grades', 'view'],
  ['result_grades.edit', 'Result Grades', 'Edit Result Grades', 'Can edit result grades', '/result-grades', 'edit'],
  ['store.reports', 'Store', 'Store Reports', 'Can view store reports', '/store/reports', 'reports'],
  ['store.items.view', 'Store', 'View Store Items', 'Can view store items', '/store/items', 'items.view'],
  ['store.items.create', 'Store', 'Create Store Items', 'Can create store items', '/store/items', 'items.create'],
  ['store.units.view', 'Store', 'View Store Units', 'Can view store units', '/store/units', 'units.view'],
  ['store.categories.view', 'Store', 'View Store Categories', 'Can view store categories', '/store/categories', 'categories.view'],
  ['store.purchases.view', 'Store', 'View Store Purchases', 'Can view store purchases', '/store/purchases', 'purchases.view'],
  ['store.purchases.create', 'Store', 'Create Store Purchases', 'Can create store purchases', '/store/purchases', 'purchases.create'],
  ['store.stock_issues.view', 'Store', 'View Stock Issues', 'Can view stock issues', '/store/stock-issues', 'stock_issues.view'],
  ['store.stock_issues.create', 'Store', 'Create Stock Issues', 'Can create stock issues', '/store/stock-issues', 'stock_issues.create'],
  ['store.returns.view', 'Store', 'View Store Returns', 'Can view store returns', '/store/returns', 'returns.view'],
  ['store.damaged_stock.view', 'Store', 'View Damaged Stock', 'Can view damaged stock', '/store/damaged-stock', 'damaged_stock.view'],
  ['store.suppliers.view', 'Store', 'View Store Suppliers', 'Can view store suppliers', '/store/suppliers', 'suppliers.view'],
  ['store.suppliers.create', 'Store', 'Create Store Suppliers', 'Can create store suppliers', '/store/suppliers', 'suppliers.create'],
  ['settings.edit', 'Settings', 'Edit Settings', 'Can edit settings', '/settings', 'edit'],
  ['settings.shifts.view', 'Settings', 'View Shifts', 'Can view shifts', '/settings/shifts', 'shifts.view'],
  ['settings.departments.view', 'Settings', 'View Departments', 'Can view departments', '/settings/departments', 'departments.view'],
  ['settings.degrees.view', 'Settings', 'View Qualifications', 'Can view qualifications', '/settings/qualifications', 'degrees.view'],
  ['settings.cities.view', 'Settings', 'View Cities', 'Can view cities', '/settings/cities', 'cities.view'],
  ['settings.cities.create', 'Settings', 'Create Cities', 'Can create cities', '/settings/cities', 'cities.create'],
  ['settings.cities.edit', 'Settings', 'Edit Cities', 'Can edit cities', '/settings/cities', 'cities.edit'],
  ['support.view', 'Support', 'View Support', 'Can view support requests', '/support', 'view'],
  ['support.create', 'Support', 'Create Support', 'Can create support requests', '/support', 'create'],
  ['suggestions.view', 'Suggestions', 'View Suggestions', 'Can view suggestions', '/suggestions', 'view'],
  ['suggestions.create', 'Suggestions', 'Create Suggestions', 'Can create suggestions', '/suggestions', 'create'],
  ['tenant_management.view', 'Tenant Management', 'View Tenant Management', 'Can view tenant management', '/tenant-management', 'view'],
];

const LEGACY_ACTION_ALIASES = ['edit'];

function titleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildPermissionCatalog() {
  const permissions = new Map();
  let sortOrder = 10;

  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const key = `${module.key}.${action.key}`;
      permissions.set(key, {
        permissionKey: key,
        permissionName: key,
        displayLabel: `${action.label} ${module.label}`,
        description: `${action.description} in ${module.label}.`,
        pagePath: module.path,
        moduleName: module.label,
        action: action.key,
        sortOrder: sortOrder++,
      });
    }

    for (const alias of LEGACY_ACTION_ALIASES) {
      const key = `${module.key}.${alias}`;
      permissions.set(key, {
        permissionKey: key,
        permissionName: key,
        displayLabel: `Edit ${module.label}`,
        description: `Can edit ${module.label.toLowerCase()} records. Kept for backward compatibility with existing permissions.`,
        pagePath: module.path,
        moduleName: module.label,
        action: alias,
        sortOrder: sortOrder++,
      });
    }
  }

  for (const [key, moduleName, displayLabel, description, pagePath, action] of EXTRA_PERMISSIONS) {
    permissions.set(key, {
      permissionKey: key,
      permissionName: key,
      displayLabel,
      description,
      pagePath,
      moduleName,
      action,
      sortOrder: sortOrder++,
    });
  }

  return [...permissions.values()];
}

async function seedPermissions() {
  const permissions = buildPermissionCatalog();

  for (const permission of permissions) {
    await prisma.$executeRaw`
      INSERT INTO permissions
        (permission_key, permission_name, display_label, description, page_path, module_name, action, sort_order)
      VALUES
        (${permission.permissionKey}, ${permission.permissionName}, ${permission.displayLabel}, ${permission.description},
         ${permission.pagePath}, ${permission.moduleName}, ${permission.action}, ${permission.sortOrder})
      ON DUPLICATE KEY UPDATE
        permission_name = VALUES(permission_name),
        display_label = VALUES(display_label),
        description = VALUES(description),
        page_path = VALUES(page_path),
        module_name = VALUES(module_name),
        action = VALUES(action),
        sort_order = VALUES(sort_order)
    `;
  }

  await prisma.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT r.tenant_id, r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.tenant_id IS NULL
      AND r.role_name = 'super_admin'
  `;

  console.log(`Seeded ${permissions.length} global permissions.`);
}

seedPermissions()
  .catch((error) => {
    console.error('Permission seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
