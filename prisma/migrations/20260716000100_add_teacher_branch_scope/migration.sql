ALTER TABLE `teachers`
  ADD COLUMN `branch_id` INTEGER NULL;

CREATE INDEX `teachers_branch_id_idx` ON `teachers`(`branch_id`);
CREATE INDEX `teachers_tenant_id_branch_id_idx` ON `teachers`(`tenant_id`, `branch_id`);

ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
