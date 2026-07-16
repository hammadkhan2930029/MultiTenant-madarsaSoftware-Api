ALTER TABLE `tenant`
  ADD COLUMN `branch_enabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `branch_limit` INTEGER NULL;

ALTER TABLE `admins`
  ADD COLUMN `branch_id` INTEGER NULL;

ALTER TABLE `branches`
  ADD COLUMN `contact` VARCHAR(50) NULL,
  ADD COLUMN `created_by` INTEGER NULL;

CREATE INDEX `admins_branch_id_idx` ON `admins`(`branch_id`);
CREATE INDEX `admins_tenant_id_branch_id_idx` ON `admins`(`tenant_id`, `branch_id`);
CREATE INDEX `branches_tenant_id_status_idx` ON `branches`(`tenant_id`, `status`);
CREATE INDEX `branches_created_by_idx` ON `branches`(`created_by`);

ALTER TABLE `admins`
  ADD CONSTRAINT `admins_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `branches`
  ADD CONSTRAINT `branches_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
