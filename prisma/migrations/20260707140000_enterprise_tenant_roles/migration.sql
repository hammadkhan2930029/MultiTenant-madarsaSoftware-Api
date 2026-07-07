ALTER TABLE `roles`
  ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  ADD COLUMN `is_system_role` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `updated_by` INTEGER NULL;

CREATE INDEX `roles_status_idx` ON `roles`(`status`);
CREATE INDEX `roles_is_system_role_idx` ON `roles`(`is_system_role`);
CREATE INDEX `roles_updated_by_idx` ON `roles`(`updated_by`);

ALTER TABLE `roles`
  ADD CONSTRAINT `roles_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `roles`
SET `is_system_role` = true
WHERE `role_name` IN ('super_admin', 'admin', 'teacher', 'accountant', 'store_manager', 'viewer');

INSERT INTO `roles` (`tenant_id`, `role_name`, `description`, `status`, `is_system_role`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT NULL, 'receptionist', 'Front desk admissions and visitor handling role.', 'active', true, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `tenant_id` IS NULL AND `role_name` = 'receptionist'
);

INSERT INTO `roles` (`tenant_id`, `role_name`, `description`, `status`, `is_system_role`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT NULL, 'read_only', 'Read-only access for allowed pages.', 'active', true, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `tenant_id` IS NULL AND `role_name` = 'read_only'
);

INSERT INTO `roles` (`tenant_id`, `role_name`, `description`, `status`, `is_system_role`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT t.`id`, seed.`role_name`, seed.`description`, 'active', true, t.`ownerAdminId`, t.`ownerAdminId`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `tenant` t
JOIN (
  SELECT 'admin' AS `role_name`, 'Tenant administrator role.' AS `description`
  UNION ALL SELECT 'teacher', 'Teaching, attendance, hifz, and exams role.'
  UNION ALL SELECT 'accountant', 'Finance, fees, salary, and reports role.'
  UNION ALL SELECT 'receptionist', 'Front desk admissions and visitor handling role.'
  UNION ALL SELECT 'read_only', 'Read-only access for allowed pages.'
) seed
LEFT JOIN `roles` existing_role
  ON existing_role.`tenant_id` = t.`id`
 AND existing_role.`role_name` = seed.`role_name`
WHERE existing_role.`id` IS NULL;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT tenant_role.`id`, rp.`permission_id`
FROM `roles` global_role
JOIN `role_permissions` rp
  ON rp.`role_id` = global_role.`id`
JOIN `roles` tenant_role
  ON tenant_role.`tenant_id` IS NOT NULL
 AND tenant_role.`role_name` = global_role.`role_name`
WHERE global_role.`tenant_id` IS NULL
  AND global_role.`role_name` IN ('admin', 'teacher', 'accountant', 'receptionist', 'read_only');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT read_only_role.`id`, rp.`permission_id`
FROM `roles` viewer_role
JOIN `role_permissions` rp
  ON rp.`role_id` = viewer_role.`id`
JOIN `roles` read_only_role
  ON read_only_role.`tenant_id` <=> viewer_role.`tenant_id`
 AND read_only_role.`role_name` = 'read_only'
WHERE viewer_role.`role_name` = 'viewer';
