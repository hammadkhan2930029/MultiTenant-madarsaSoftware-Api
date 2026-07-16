ALTER TABLE `exam_results`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `exam_results_branch_id_idx`(`branch_id`),
  ADD INDEX `exam_results_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);
