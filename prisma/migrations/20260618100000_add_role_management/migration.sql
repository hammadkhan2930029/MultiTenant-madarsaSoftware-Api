CREATE TABLE `roles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_by` INTEGER NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `roles_role_name_key`(`role_name`),
  INDEX `roles_created_by_idx`(`created_by`),
  PRIMARY KEY (`id`),
  CONSTRAINT `roles_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `permission_key` VARCHAR(150) NOT NULL,
  `permission_name` VARCHAR(150) NOT NULL,
  `page_path` VARCHAR(255) NULL,
  `module_name` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE INDEX `permissions_permission_key_key`(`permission_key`),
  INDEX `permissions_module_name_idx`(`module_name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `role_id` INTEGER NOT NULL,
  `permission_id` INTEGER NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
  INDEX `role_permissions_permission_id_idx`(`permission_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `role_permissions_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_permission_id_fkey`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admins`
  ADD COLUMN `role_id` INTEGER NULL,
  ADD INDEX `admins_role_id_idx`(`role_id`),
  ADD CONSTRAINT `admins_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `roles` (`role_name`, `description`, `created_by`)
VALUES
  ('super_admin', 'Full system access with all role and permission management rights.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1)),
  ('admin', 'General madarsa administration role.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1)),
  ('accountant', 'Finance, fees, salary, and reports access.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1)),
  ('teacher', 'Limited teaching, attendance, hifz, and exam access.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1)),
  ('store_manager', 'Store management access.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1)),
  ('viewer', 'Read-only access for allowed pages.', (SELECT `id` FROM `admins` ORDER BY `id` LIMIT 1));

INSERT INTO `permissions` (`permission_key`, `permission_name`, `page_path`, `module_name`)
VALUES
  ('dashboard.view', 'View Dashboard', '/dashboard', 'dashboard'),
  ('roles.view', 'View Roles', '/role-management', 'role_management'),
  ('roles.create', 'Create Roles', '/role-management', 'role_management'),
  ('roles.edit', 'Edit Roles', '/role-management', 'role_management'),
  ('roles.delete', 'Delete Roles', '/role-management', 'role_management'),
  ('users.view', 'View Users', '/role-management/users', 'users'),
  ('users.create', 'Create Users', '/role-management/users', 'users'),
  ('users.edit', 'Edit Users', '/role-management/users', 'users'),
  ('users.delete', 'Delete Users', '/role-management/users', 'users'),
  ('users.reset_password', 'Reset User Password', '/role-management/users', 'users'),
  ('class_management.view', 'View Class Management', '/class-management/Classes', 'class_management'),
  ('class_management.create', 'Create Class Management Records', '/class-management/Classes', 'class_management'),
  ('class_management.edit', 'Edit Class Management Records', '/class-management/Classes', 'class_management'),
  ('class_management.delete', 'Delete Class Management Records', '/class-management/Classes', 'class_management'),
  ('students.view', 'View Students', '/students/list', 'students'),
  ('students.create', 'Create Students', '/students/admission', 'students'),
  ('students.edit', 'Edit Students', '/students/list', 'students'),
  ('students.delete', 'Delete Students', '/students/list', 'students'),
  ('parents.view', 'View Parents', '/students/parents', 'parents'),
  ('parents.create', 'Create Parents', '/students/parents', 'parents'),
  ('parents.edit', 'Edit Parents', '/students/parents', 'parents'),
  ('parents.delete', 'Delete Parents', '/students/parents', 'parents'),
  ('student_fees.view', 'View Student Fees', '/students/fees', 'student_fees'),
  ('student_fees.create', 'Generate Student Fees', '/students/fees', 'student_fees'),
  ('student_fees.edit', 'Edit Student Fees', '/students/fees', 'student_fees'),
  ('attendance.view', 'View Attendance', '/students/attendance', 'attendance'),
  ('attendance.create', 'Mark Attendance', '/students/attendance', 'attendance'),
  ('attendance.delete', 'Delete Attendance', '/teachers/attendance', 'attendance'),
  ('teachers.view', 'View Teachers', '/teachers/list', 'teachers'),
  ('teachers.create', 'Create Teachers', '/HRManagement', 'teachers'),
  ('teachers.edit', 'Edit Teachers', '/teachers/list', 'teachers'),
  ('teachers.delete', 'Delete Teachers', '/teachers/list', 'teachers'),
  ('staff.view', 'View Staff', '/staff/list', 'staff'),
  ('staff.create', 'Create Staff', '/HRManagement?staffType=staff', 'staff'),
  ('staff.edit', 'Edit Staff', '/staff/list', 'staff'),
  ('staff.delete', 'Delete Staff', '/staff/list', 'staff'),
  ('salary.view', 'View Salary', '/finance/expenses/payroll', 'salary'),
  ('salary.create', 'Create Salary', '/finance/expenses/payroll', 'salary'),
  ('salary.edit', 'Edit Salary', '/finance/expenses/payroll', 'salary'),
  ('salary.delete', 'Delete Salary', '/finance/expenses/payroll', 'salary'),
  ('hifz.view', 'View Hifz', '/hifz', 'hifz'),
  ('hifz.create', 'Create Hifz Records', '/hifz', 'hifz'),
  ('hifz.edit', 'Edit Hifz Records', '/hifz', 'hifz'),
  ('hifz.delete', 'Delete Hifz Records', '/hifz', 'hifz'),
  ('finance.view', 'View Finance', '/finance', 'finance'),
  ('finance.create', 'Create Finance Records', '/finance', 'finance'),
  ('finance.edit', 'Edit Finance Records', '/finance', 'finance'),
  ('finance.delete', 'Delete Finance Records', '/finance', 'finance'),
  ('finance.reports', 'View Finance Reports', '/finance/reports/financial-statements', 'finance'),
  ('store.view', 'View Store', '/store/dashboard', 'store'),
  ('store.create', 'Create Store Records', '/store', 'store'),
  ('store.edit', 'Edit Store Records', '/store', 'store'),
  ('store.delete', 'Delete Store Records', '/store', 'store'),
  ('store.approve', 'Approve Store Records', '/store/approvals', 'store'),
  ('store.reports', 'View Store Reports', '/store/reports', 'store'),
  ('store.export', 'Export Store Reports', '/store/reports', 'store'),
  ('exams.view', 'View Exams', '/exams/schedule-list', 'exams'),
  ('exams.create', 'Create Exams', '/exams/schedule', 'exams'),
  ('exams.edit', 'Edit Exams', '/exams/schedule-list', 'exams'),
  ('exams.delete', 'Delete Exams', '/exams/schedule-list', 'exams'),
  ('settings.view', 'View Settings', '/setting/shift', 'settings'),
  ('settings.edit', 'Edit Settings', '/setting/shift', 'settings'),
  ('profile.view', 'View Profile', '/Profile/setting', 'profile'),
  ('profile.edit', 'Edit Profile', '/Profile/setting', 'profile'),
  ('support.view', 'View Support', '/Profile/support', 'support'),
  ('support.create', 'Create Support Request', '/Profile/support', 'support'),
  ('suggestions.view', 'View Suggestions', '/Profile/suggestions', 'suggestions'),
  ('suggestions.create', 'Create Suggestions', '/Profile/suggestions', 'suggestions');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
CROSS JOIN `permissions`
WHERE `roles`.`role_name` = 'super_admin';

UPDATE `admins`
SET `role_id` = (SELECT `id` FROM `roles` WHERE `role_name` = 'super_admin' LIMIT 1)
WHERE `role_id` IS NULL;
