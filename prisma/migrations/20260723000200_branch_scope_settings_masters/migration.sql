ALTER TABLE `shifts`
  ADD COLUMN `tenant_id` INT NULL,
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `departments`
  ADD COLUMN `tenant_id` INT NULL,
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `qualifications`
  ADD COLUMN `tenant_id` INT NULL,
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `result_grades`
  ADD COLUMN `branch_id` INT NULL;

ALTER TABLE `shifts`
  DROP INDEX `shifts_name_key`,
  ADD UNIQUE INDEX `shifts_tenant_id_branch_id_name_key`(`tenant_id`, `branch_id`, `name`),
  ADD INDEX `shifts_tenant_id_idx`(`tenant_id`),
  ADD INDEX `shifts_branch_id_idx`(`branch_id`),
  ADD INDEX `shifts_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `departments`
  DROP INDEX `departments_name_key`,
  DROP INDEX `departments_code_key`,
  ADD UNIQUE INDEX `departments_tenant_id_branch_id_name_key`(`tenant_id`, `branch_id`, `name`),
  ADD UNIQUE INDEX `departments_tenant_id_branch_id_code_key`(`tenant_id`, `branch_id`, `code`),
  ADD INDEX `departments_tenant_id_idx`(`tenant_id`),
  ADD INDEX `departments_branch_id_idx`(`branch_id`),
  ADD INDEX `departments_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `qualifications`
  DROP INDEX `qualifications_title_key`,
  ADD UNIQUE INDEX `qualifications_tenant_id_branch_id_title_key`(`tenant_id`, `branch_id`, `title`),
  ADD INDEX `qualifications_tenant_id_idx`(`tenant_id`),
  ADD INDEX `qualifications_branch_id_idx`(`branch_id`),
  ADD INDEX `qualifications_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `result_grades`
  ADD INDEX `result_grades_branch_id_idx`(`branch_id`),
  ADD INDEX `result_grades_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `shifts`
  ADD CONSTRAINT `shifts_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `shifts_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `departments`
  ADD CONSTRAINT `departments_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `departments_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `qualifications`
  ADD CONSTRAINT `qualifications_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `qualifications_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `result_grades`
  ADD CONSTRAINT `result_grades_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
