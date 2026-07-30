DROP INDEX `subjects_tenant_id_branch_id_name_key` ON `subjects`;

CREATE INDEX `subjects_tenant_id_branch_id_name_idx`
ON `subjects`(`tenant_id`, `branch_id`, `name`);
