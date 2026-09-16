-- Additive RBAC permissions for separating Student Fees access from General Finance.
-- Existing permission assignments are preserved; no business records are changed.
INSERT INTO `permissions`
  (`permission_key`, `permission_name`, `display_label`, `description`, `page_path`, `module_name`, `action`, `sort_order`, `created_at`)
VALUES
  ('student_fees.collect', 'Collect Student Fees', 'طلباء کی فیس وصول کریں', 'Assigned students ki fee receive aur save karne ki اجازت۔', '/students/fees', 'student_fees', 'collect', 4, CURRENT_TIMESTAMP),
  ('student_fees.history', 'View Student Fee History', 'طلباء کی فیس ہسٹری دیکھیں', 'Assigned students ki fee history dekhne ki اجازت۔', '/students/fees', 'student_fees', 'history', 5, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  `permission_name` = VALUES(`permission_name`),
  `display_label` = VALUES(`display_label`),
  `description` = VALUES(`description`),
  `page_path` = VALUES(`page_path`),
  `module_name` = VALUES(`module_name`),
  `action` = VALUES(`action`),
  `sort_order` = VALUES(`sort_order`);

-- Preserve the intended capabilities of roles already using granular Student Fee permissions.
INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, historyPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` existingPermission
  ON existingPermission.`id` = rp.`permission_id`
INNER JOIN `permissions` historyPermission
  ON historyPermission.`permission_key` = 'student_fees.history'
WHERE existingPermission.`permission_key` = 'student_fees.view';

INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, collectPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` existingPermission
  ON existingPermission.`id` = rp.`permission_id`
INNER JOIN `permissions` collectPermission
  ON collectPermission.`permission_key` = 'student_fees.collect'
WHERE existingPermission.`permission_key` IN ('student_fees.create', 'student_fees.edit');
