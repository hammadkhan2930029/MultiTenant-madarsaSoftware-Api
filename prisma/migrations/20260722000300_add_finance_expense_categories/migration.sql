CREATE TABLE IF NOT EXISTS `finance_expense_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_expense_categories_tenant_name_uq` (`tenant_id`, `name`),
  KEY `finance_expense_categories_tenant_id_idx` (`tenant_id`),
  KEY `finance_expense_categories_status_idx` (`status`),
  CONSTRAINT `finance_expense_categories_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT IGNORE INTO `finance_expense_categories` (`tenant_id`, `name`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, 'عام اخراجات', 'active', NOW(3), NOW(3) FROM `tenant`;

INSERT IGNORE INTO `finance_expense_categories` (`tenant_id`, `name`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, 'انتظامی اخراجات', 'active', NOW(3), NOW(3) FROM `tenant`;

INSERT IGNORE INTO `finance_expense_categories` (`tenant_id`, `name`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, 'مستقل اثاثے', 'active', NOW(3), NOW(3) FROM `tenant`;

INSERT IGNORE INTO `finance_expense_categories` (`tenant_id`, `name`, `status`, `createdAt`, `updatedAt`)
SELECT `id`, 'عملے کے متعلق', 'active', NOW(3), NOW(3) FROM `tenant`;
