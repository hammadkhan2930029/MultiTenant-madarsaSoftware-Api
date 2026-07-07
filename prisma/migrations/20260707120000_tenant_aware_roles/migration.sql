ALTER TABLE `roles`
  ADD COLUMN `tenant_id` INTEGER NULL;

DROP INDEX `roles_role_name_key` ON `roles`;

CREATE INDEX `roles_tenant_id_idx` ON `roles`(`tenant_id`);
CREATE UNIQUE INDEX `roles_tenant_id_role_name_key` ON `roles`(`tenant_id`, `role_name`);

ALTER TABLE `roles`
  ADD CONSTRAINT `roles_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `roles` (`tenant_id`, `role_name`, `description`, `created_by`, `created_at`, `updated_at`)
SELECT
  t.`id`,
  r.`role_name`,
  r.`description`,
  t.`ownerAdminId`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `tenant` t
JOIN `roles` r
  ON r.`tenant_id` IS NULL
 AND r.`role_name` <> 'super_admin';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT tenant_roles.`id`, rp.`permission_id`
FROM `roles` global_roles
JOIN `role_permissions` rp
  ON rp.`role_id` = global_roles.`id`
JOIN `roles` tenant_roles
  ON tenant_roles.`tenant_id` IS NOT NULL
 AND tenant_roles.`role_name` = global_roles.`role_name`
WHERE global_roles.`tenant_id` IS NULL
  AND global_roles.`role_name` <> 'super_admin';

UPDATE `admins` a
JOIN `roles` current_role_row
  ON current_role_row.`id` = a.`role_id`
JOIN `roles` tenant_role
  ON tenant_role.`tenant_id` = a.`tenant_id`
 AND tenant_role.`role_name` = current_role_row.`role_name`
SET a.`role_id` = tenant_role.`id`
WHERE a.`tenant_id` IS NOT NULL
  AND current_role_row.`tenant_id` IS NULL
  AND current_role_row.`role_name` <> 'super_admin';
