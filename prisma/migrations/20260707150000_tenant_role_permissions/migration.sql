ALTER TABLE `role_permissions`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `role_permissions` rp
JOIN `roles` r
  ON r.`id` = rp.`role_id`
SET rp.`tenant_id` = r.`tenant_id`;

CREATE INDEX `role_permissions_tenant_id_idx` ON `role_permissions`(`tenant_id`);

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
