-- Separate Teacher Attendance permissions from Student Attendance permissions.
-- Existing business records are untouched. Roles that explicitly had teacher-attendance
-- access keep their previously available actions after the authorization split.
INSERT INTO `permissions`
  (`permission_key`, `permission_name`, `display_label`, `description`, `page_path`, `module_name`, `action`, `sort_order`, `created_at`)
VALUES
  ('teachers.attendance.view', 'View Teacher Attendance', 'اساتذہ کی حاضری دیکھیں', 'اساتذہ کی حاضری اور سابقہ ریکارڈ دیکھنے کی اجازت۔', '/teachers/attendance', 'teachers', 'view', 6, CURRENT_TIMESTAMP),
  ('teachers.attendance.create', 'Create Teacher Attendance', 'اساتذہ کی حاضری درج کریں', 'اساتذہ کی نئی حاضری درج کرنے کی اجازت۔', '/teachers/attendance', 'teachers', 'create', 7, CURRENT_TIMESTAMP),
  ('teachers.attendance.edit', 'Edit Teacher Attendance', 'اساتذہ کی حاضری میں ترمیم کریں', 'اساتذہ کی موجودہ حاضری میں ترمیم کرنے کی اجازت۔', '/teachers/attendance', 'teachers', 'edit', 8, CURRENT_TIMESTAMP),
  ('teachers.attendance.delete', 'Delete Teacher Attendance', 'اساتذہ کی حاضری حذف کریں', 'اساتذہ کی حاضری حذف کرنے کی اجازت۔', '/teachers/attendance', 'teachers', 'delete', 9, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `display_label` = VALUES(`display_label`),
  `description` = VALUES(`description`),
  `page_path` = VALUES(`page_path`),
  `module_name` = VALUES(`module_name`),
  `action` = VALUES(`action`),
  `sort_order` = VALUES(`sort_order`);

-- Before this change the view key was also accepted by create/delete routes. Preserve
-- those explicit teacher-attendance roles while making future assignments granular.
INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` sourcePermission
  ON sourcePermission.`id` = rp.`permission_id`
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` IN ('teachers.attendance.create', 'teachers.attendance.edit', 'teachers.attendance.delete')
WHERE sourcePermission.`permission_key` = 'teachers.attendance.view';
