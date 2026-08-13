SET @drop_legacy_finance_head_unique := IF(
  EXISTS(
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'finance_heads'
      AND INDEX_NAME = 'finance_heads_tenant_id_name_key'
  ),
  'ALTER TABLE `finance_heads` DROP INDEX `finance_heads_tenant_id_name_key`',
  'SELECT 1'
);

PREPARE drop_legacy_finance_head_unique_stmt FROM @drop_legacy_finance_head_unique;
EXECUTE drop_legacy_finance_head_unique_stmt;
DEALLOCATE PREPARE drop_legacy_finance_head_unique_stmt;
