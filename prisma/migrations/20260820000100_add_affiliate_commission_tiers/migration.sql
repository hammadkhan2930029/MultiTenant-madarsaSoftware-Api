CREATE TABLE `affiliate_commission_tiers` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `min_referrals` INTEGER NOT NULL,
  `max_referrals` INTEGER NULL,
  `percentage` DECIMAL(5, 2) NOT NULL,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `created_by_admin_id` INTEGER NULL,
  `updated_by_admin_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `aff_tier_status_dates_idx` (`status`, `effective_from`, `effective_to`),
  INDEX `aff_tier_referral_range_idx` (`min_referrals`, `max_referrals`),
  INDEX `aff_tier_created_by_idx` (`created_by_admin_id`),
  INDEX `aff_tier_updated_by_idx` (`updated_by_admin_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_commission_tiers_created_by_admin_id_fkey`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `affiliate_commission_tiers_updated_by_admin_id_fkey`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
