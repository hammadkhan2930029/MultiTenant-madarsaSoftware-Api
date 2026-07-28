-- Safe repair migration for databases where branch-scoped master tables existed
-- before branch_id was added. This migration is intentionally idempotent.

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'tenant_id'),
  'SELECT 1',
  'ALTER TABLE `shifts` ADD COLUMN `tenant_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `shifts` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'tenant_id'),
  'SELECT 1',
  'ALTER TABLE `departments` ADD COLUMN `tenant_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `departments` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qualifications' AND COLUMN_NAME = 'tenant_id'),
  'SELECT 1',
  'ALTER TABLE `qualifications` ADD COLUMN `tenant_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qualifications' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `qualifications` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_heads' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `finance_heads` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_expense_categories' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `finance_expense_categories` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_items' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `store_items` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_units' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `store_units` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_categories' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `store_categories` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_suppliers' AND COLUMN_NAME = 'branch_id'),
  'SELECT 1',
  'ALTER TABLE `store_suppliers` ADD COLUMN `branch_id` INT NULL'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND INDEX_NAME = 'shifts_tenant_branch_name_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `shifts_tenant_branch_name_uq` ON `shifts`(`tenant_id`, `branch_id`, `name`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND INDEX_NAME = 'departments_tenant_branch_name_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `departments_tenant_branch_name_uq` ON `departments`(`tenant_id`, `branch_id`, `name`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qualifications' AND INDEX_NAME = 'qualifications_tenant_branch_title_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `qualifications_tenant_branch_title_uq` ON `qualifications`(`tenant_id`, `branch_id`, `title`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_heads' AND INDEX_NAME = 'finance_heads_tenant_id_branch_id_name_key'), 'SELECT 1', 'CREATE UNIQUE INDEX `finance_heads_tenant_id_branch_id_name_key` ON `finance_heads`(`tenant_id`, `branch_id`, `name`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_expense_categories' AND INDEX_NAME = 'finance_expense_categories_tenant_id_branch_id_name_key'), 'SELECT 1', 'CREATE UNIQUE INDEX `finance_expense_categories_tenant_id_branch_id_name_key` ON `finance_expense_categories`(`tenant_id`, `branch_id`, `name`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_items' AND INDEX_NAME = 'store_items_tenant_branch_item_code_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `store_items_tenant_branch_item_code_uq` ON `store_items`(`tenant_id`, `branch_id`, `itemCode`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_units' AND INDEX_NAME = 'store_units_tenant_branch_short_name_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `store_units_tenant_branch_short_name_uq` ON `store_units`(`tenant_id`, `branch_id`, `shortName`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_categories' AND INDEX_NAME = 'store_categories_tenant_branch_name_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `store_categories_tenant_branch_name_uq` ON `store_categories`(`tenant_id`, `branch_id`, `name`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store_suppliers' AND INDEX_NAME = 'store_suppliers_tenant_branch_name_uq'), 'SELECT 1', 'CREATE UNIQUE INDEX `store_suppliers_tenant_branch_name_uq` ON `store_suppliers`(`tenant_id`, `branch_id`, `supplierName`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND INDEX_NAME = 'shifts_tenant_branch_idx'), 'SELECT 1', 'CREATE INDEX `shifts_tenant_branch_idx` ON `shifts`(`tenant_id`, `branch_id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND INDEX_NAME = 'departments_tenant_branch_idx'), 'SELECT 1', 'CREATE INDEX `departments_tenant_branch_idx` ON `departments`(`tenant_id`, `branch_id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'qualifications' AND INDEX_NAME = 'qualifications_tenant_branch_idx'), 'SELECT 1', 'CREATE INDEX `qualifications_tenant_branch_idx` ON `qualifications`(`tenant_id`, `branch_id`)');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
