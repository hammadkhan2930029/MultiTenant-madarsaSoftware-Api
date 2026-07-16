ALTER TABLE `fund_collections`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `fund_collections_branch_id_idx`(`branch_id`),
  ADD INDEX `fund_collections_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `salary_entries`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `salary_entries_branch_id_idx`(`branch_id`),
  ADD INDEX `salary_entries_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `finance_transactions`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `finance_transactions_branch_id_idx`(`branch_id`),
  ADD INDEX `finance_transactions_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `financial_records`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `financial_records_branch_id_idx`(`branch_id`),
  ADD INDEX `financial_records_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_supplier_payments`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_supplier_payments_branch_id_idx`(`branch_id`),
  ADD INDEX `store_supplier_payments_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_purchases`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_purchases_branch_id_idx`(`branch_id`),
  ADD INDEX `store_purchases_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_purchase_items`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_purchase_items_branch_id_idx`(`branch_id`),
  ADD INDEX `store_purchase_items_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_stock_issues`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_stock_issues_branch_id_idx`(`branch_id`),
  ADD INDEX `store_stock_issues_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_returns`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_returns_branch_id_idx`(`branch_id`),
  ADD INDEX `store_returns_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_damaged_stock`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_damaged_stock_branch_id_idx`(`branch_id`),
  ADD INDEX `store_damaged_stock_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_approval_logs`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_approval_logs_branch_id_idx`(`branch_id`),
  ADD INDEX `store_approval_logs_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);

ALTER TABLE `store_stock_adjustments`
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD INDEX `store_stock_adjustments_branch_id_idx`(`branch_id`),
  ADD INDEX `store_stock_adjustments_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`);
