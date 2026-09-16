-- Complete the one-time transition from legacy fees.* keys to granular student_fees.* keys.
-- No fee, finance, tenant, branch, or student business records are changed.
INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` sourcePermission
  ON sourcePermission.`id` = rp.`permission_id`
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` IN ('student_fees.view', 'student_fees.history')
WHERE sourcePermission.`permission_key` = 'fees.details.view';

INSERT IGNORE INTO `role_permissions` (`tenant_id`, `role_id`, `permission_id`, `created_at`)
SELECT rp.`tenant_id`, rp.`role_id`, targetPermission.`id`, CURRENT_TIMESTAMP
FROM `role_permissions` rp
INNER JOIN `permissions` sourcePermission
  ON sourcePermission.`id` = rp.`permission_id`
INNER JOIN `permissions` targetPermission
  ON targetPermission.`permission_key` IN ('student_fees.view', 'student_fees.history', 'student_fees.collect', 'student_fees.edit')
WHERE sourcePermission.`permission_key` = 'fees.edit';
