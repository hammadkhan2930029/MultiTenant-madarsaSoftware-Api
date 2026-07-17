ALTER TABLE `roles`
  ADD COLUMN `branch_id` INTEGER NULL AFTER `tenant_id`,
  ADD COLUMN `role_scope_key` INTEGER NOT NULL DEFAULT 0 AFTER `branch_id`;

UPDATE `roles`
SET `role_scope_key` = COALESCE(`branch_id`, 0)
WHERE `role_scope_key` = 0;

DROP INDEX `roles_tenant_id_role_name_key` ON `roles`;

CREATE INDEX `roles_branch_id_idx` ON `roles`(`branch_id`);
CREATE INDEX `roles_tenant_id_branch_id_idx` ON `roles`(`tenant_id`, `branch_id`);
CREATE UNIQUE INDEX `roles_tenant_scope_role_name_key` ON `roles`(`tenant_id`, `role_scope_key`, `role_name`);

ALTER TABLE `roles`
  ADD CONSTRAINT `roles_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
