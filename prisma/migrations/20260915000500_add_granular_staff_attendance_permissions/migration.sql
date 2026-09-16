-- Separate Other Staff Attendance from Student and Teacher Attendance.
-- Attendance business data is unchanged; this migration only adds RBAC permissions.
INSERT INTO `permissions`
  (`permission_key`, `permission_name`, `display_label`, `description`, `page_path`, `module_name`, `action`, `sort_order`, `created_at`)
VALUES
  ('staff.attendance.view', 'View Staff Attendance', 'عملہ کی حاضری دیکھیں', 'دیگر عملہ کی حاضری اور سابقہ ریکارڈ دیکھنے کی اجازت۔', '/staff/attendance', 'staff', 'view', 5, CURRENT_TIMESTAMP),
  ('staff.attendance.create', 'Create Staff Attendance', 'عملہ کی حاضری درج کریں', 'دیگر عملہ کی نئی حاضری درج کرنے کی اجازت۔', '/staff/attendance', 'staff', 'create', 6, CURRENT_TIMESTAMP),
  ('staff.attendance.edit', 'Edit Staff Attendance', 'عملہ کی حاضری میں ترمیم کریں', 'دیگر عملہ کی موجودہ حاضری میں ترمیم کرنے کی اجازت۔', '/staff/attendance', 'staff', 'edit', 7, CURRENT_TIMESTAMP),
  ('staff.attendance.delete', 'Delete Staff Attendance', 'عملہ کی حاضری حذف کریں', 'دیگر عملہ کی حاضری حذف کرنے کی اجازت۔', '/staff/attendance', 'staff', 'delete', 8, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `display_label` = VALUES(`display_label`),
  `description` = VALUES(`description`),
  `page_path` = VALUES(`page_path`),
  `module_name` = VALUES(`module_name`),
  `action` = VALUES(`action`),
  `sort_order` = VALUES(`sort_order`);

-- Preserve access only for roles which previously had both Staff visibility and the
-- matching generic attendance action. Student-attendance-only roles gain no Staff access.
INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT attendanceRole.`tenant_id`, attendanceRole.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` attendanceRole
INNER JOIN `permissions` sourcePermission ON sourcePermission.`id` = attendanceRole.`permission_id`
INNER JOIN `role_permissions` staffRole
  ON staffRole.`tenant_id` = attendanceRole.`tenant_id` AND staffRole.`role_id` = attendanceRole.`role_id`
INNER JOIN `permissions` staffPermission
  ON staffPermission.`id` = staffRole.`permission_id` AND staffPermission.`permission_key` = 'staff.view'
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` = CONCAT('staff.', sourcePermission.`permission_key`)
WHERE sourcePermission.`permission_key` IN ('attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete');
