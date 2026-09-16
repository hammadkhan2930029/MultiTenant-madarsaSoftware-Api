-- Preserve existing Student Fees access before legacy fees.* runtime aliases are removed.
-- This migration only adds equivalent role-permission links; it does not change fee or finance records.
INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` sourcePermission
  ON sourcePermission.`id` = rp.`permission_id`
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` IN ('student_fees.view', 'student_fees.history')
WHERE sourcePermission.`permission_key` = 'fees.view';

INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` sourcePermission
  ON sourcePermission.`id` = rp.`permission_id`
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` IN ('student_fees.create', 'student_fees.edit', 'student_fees.collect', 'student_fees.history')
WHERE sourcePermission.`permission_key` = 'fees.create';
