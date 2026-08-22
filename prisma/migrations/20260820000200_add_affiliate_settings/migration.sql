CREATE TABLE `affiliate_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `scope_key` VARCHAR(30) NOT NULL DEFAULT 'global',
  `withdrawal_interval_days` INTEGER NOT NULL DEFAULT 0,
  `allow_blank_withdrawal_amount` BOOLEAN NOT NULL DEFAULT true,
  `allow_only_one_pending_request` BOOLEAN NOT NULL DEFAULT true,
  `minimum_withdrawal_amount` DECIMAL(12, 2) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `created_by_admin_id` INTEGER NULL,
  `updated_by_admin_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliate_settings_scope_key_key` (`scope_key`),
  INDEX `aff_setting_status_idx` (`status`),
  INDEX `aff_setting_created_by_idx` (`created_by_admin_id`),
  INDEX `aff_setting_updated_by_idx` (`updated_by_admin_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_settings_created_by_admin_id_fkey`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `affiliate_settings_updated_by_admin_id_fkey`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
