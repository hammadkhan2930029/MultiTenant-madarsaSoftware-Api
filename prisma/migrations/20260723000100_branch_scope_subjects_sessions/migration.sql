ALTER TABLE `subjects`
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `sessions`
  ADD COLUMN `tenant_id` INT NULL,
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `subjects`
  DROP INDEX `subjects_tenant_id_name_key`;

ALTER TABLE `sessions`
  DROP INDEX `sessions_name_key`;

ALTER TABLE `subjects`
  ADD UNIQUE INDEX `subjects_tenant_id_branch_id_name_key`(`tenant_id`, `branch_id`, `name`),
  ADD INDEX `subjects_branch_id_idx`(`branch_id`),
  ADD INDEX `subjects_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `sessions`
  ADD UNIQUE INDEX `sessions_tenant_id_branch_id_name_key`(`tenant_id`, `branch_id`, `name`),
  ADD INDEX `sessions_tenant_id_idx`(`tenant_id`),
  ADD INDEX `sessions_branch_id_idx`(`branch_id`),
  ADD INDEX `sessions_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `sessions_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
