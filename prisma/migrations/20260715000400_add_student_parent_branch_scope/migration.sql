ALTER TABLE `students`
  ADD COLUMN `branch_id` INTEGER NULL;

ALTER TABLE `parents`
  ADD COLUMN `branch_id` INTEGER NULL;

CREATE INDEX `students_branch_id_idx` ON `students`(`branch_id`);
CREATE INDEX `students_tenant_id_branch_id_idx` ON `students`(`tenant_id`, `branch_id`);
CREATE INDEX `parents_branch_id_idx` ON `parents`(`branch_id`);
CREATE INDEX `parents_tenant_id_branch_id_idx` ON `parents`(`tenant_id`, `branch_id`);

ALTER TABLE `students`
  ADD CONSTRAINT `students_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `parents`
  ADD CONSTRAINT `parents_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
