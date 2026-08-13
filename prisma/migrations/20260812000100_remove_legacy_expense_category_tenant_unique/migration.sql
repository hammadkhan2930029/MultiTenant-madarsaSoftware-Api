SET @drop_legacy_expense_category_unique := IF(
  EXISTS(
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'finance_expense_categories'
      AND INDEX_NAME = 'finance_expense_categories_tenant_name_uq'
  ),
  'ALTER TABLE `finance_expense_categories` DROP INDEX `finance_expense_categories_tenant_name_uq`',
  'SELECT 1'
);

PREPARE drop_legacy_expense_category_unique_stmt FROM @drop_legacy_expense_category_unique;
EXECUTE drop_legacy_expense_category_unique_stmt;
DEALLOCATE PREPARE drop_legacy_expense_category_unique_stmt;
