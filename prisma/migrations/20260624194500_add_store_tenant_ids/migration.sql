SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

ALTER TABLE `store_items`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_items`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `store_items`
  DROP INDEX `store_items_itemCode_key`,
  ADD UNIQUE INDEX `store_items_tenant_item_code_uq`(`tenant_id`, `itemCode`),
  ADD INDEX `store_items_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_items_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_units`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_units`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `store_units`
  DROP INDEX `store_units_shortName_key`,
  ADD UNIQUE INDEX `store_units_tenant_short_name_uq`(`tenant_id`, `shortName`),
  ADD INDEX `store_units_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_units_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_categories`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_categories`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `store_categories`
  DROP INDEX `store_categories_name_key`,
  ADD UNIQUE INDEX `store_categories_tenant_name_uq`(`tenant_id`, `name`),
  ADD INDEX `store_categories_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_categories_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_suppliers`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_suppliers`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `store_suppliers`
  DROP INDEX `store_suppliers_supplierName_key`,
  ADD UNIQUE INDEX `store_suppliers_tenant_name_uq`(`tenant_id`, `supplierName`),
  ADD INDEX `store_suppliers_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_suppliers_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_purchases`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_purchases` p
LEFT JOIN `store_suppliers` s ON s.`id` = p.`supplierId`
SET p.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE p.`tenant_id` IS NULL;

ALTER TABLE `store_purchases`
  ADD INDEX `store_purchases_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_purchases_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_purchase_items`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_purchase_items` pi
LEFT JOIN `store_purchases` p ON p.`id` = pi.`purchaseId`
LEFT JOIN `store_items` i ON i.`id` = pi.`itemId`
SET pi.`tenant_id` = COALESCE(p.`tenant_id`, i.`tenant_id`, @default_tenant_id)
WHERE pi.`tenant_id` IS NULL;

ALTER TABLE `store_purchase_items`
  ADD INDEX `store_purchase_items_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_purchase_items_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_supplier_payments`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_supplier_payments` sp
LEFT JOIN `store_suppliers` s ON s.`id` = sp.`supplierId`
SET sp.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE sp.`tenant_id` IS NULL;

ALTER TABLE `store_supplier_payments`
  ADD INDEX `store_supplier_payments_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_supplier_payments_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_stock_issues`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_stock_issues` si
LEFT JOIN `store_items` i ON i.`id` = si.`itemId`
SET si.`tenant_id` = COALESCE(i.`tenant_id`, @default_tenant_id)
WHERE si.`tenant_id` IS NULL;

ALTER TABLE `store_stock_issues`
  ADD INDEX `store_stock_issues_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_stock_issues_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_returns`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_returns` r
LEFT JOIN `store_stock_issues` si ON si.`id` = r.`stockIssueId`
LEFT JOIN `store_items` i ON i.`id` = r.`itemId`
SET r.`tenant_id` = COALESCE(si.`tenant_id`, i.`tenant_id`, @default_tenant_id)
WHERE r.`tenant_id` IS NULL;

ALTER TABLE `store_returns`
  ADD INDEX `store_returns_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_returns_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_damaged_stock`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_damaged_stock` ds
LEFT JOIN `store_returns` r ON r.`id` = ds.`returnId`
LEFT JOIN `store_items` i ON i.`id` = ds.`itemId`
SET ds.`tenant_id` = COALESCE(r.`tenant_id`, i.`tenant_id`, @default_tenant_id)
WHERE ds.`tenant_id` IS NULL;

ALTER TABLE `store_damaged_stock`
  ADD INDEX `store_damaged_stock_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_damaged_stock_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_approval_logs`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_approval_logs`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `store_approval_logs`
  ADD INDEX `store_approval_logs_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_approval_logs_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `store_stock_adjustments`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `store_stock_adjustments` sa
LEFT JOIN `store_items` i ON i.`id` = sa.`itemId`
SET sa.`tenant_id` = COALESCE(i.`tenant_id`, @default_tenant_id)
WHERE sa.`tenant_id` IS NULL;

ALTER TABLE `store_stock_adjustments`
  ADD INDEX `store_stock_adjustments_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `store_stock_adjustments_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
