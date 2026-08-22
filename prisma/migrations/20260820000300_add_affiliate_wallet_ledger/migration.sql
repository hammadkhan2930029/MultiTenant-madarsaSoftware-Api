ALTER TABLE `tenant`
  ADD COLUMN `sale_amount` DECIMAL(12, 2) NULL,
  ADD COLUMN `sale_currency` VARCHAR(10) NULL;

CREATE TABLE `affiliate_commissions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `referrer_tenant_id` INTEGER NOT NULL,
  `referred_tenant_id` INTEGER NOT NULL,
  `commission_tier_id` INTEGER NULL,
  `referral_count_snapshot` INTEGER NOT NULL,
  `sale_amount_snapshot` DECIMAL(12, 2) NULL,
  `percentage_snapshot` DECIMAL(5, 2) NULL,
  `commission_amount` DECIMAL(12, 2) NULL,
  `currency` VARCHAR(10) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending_calculation',
  `earned_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliate_commissions_referred_tenant_id_key` (`referred_tenant_id`),
  INDEX `aff_comm_referrer_status_idx` (`referrer_tenant_id`, `status`),
  INDEX `aff_comm_tier_idx` (`commission_tier_id`),
  INDEX `aff_comm_earned_at_idx` (`earned_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `aff_comm_referrer_tenant_fkey`
    FOREIGN KEY (`referrer_tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_comm_referred_tenant_fkey`
    FOREIGN KEY (`referred_tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_comm_tier_fkey`
    FOREIGN KEY (`commission_tier_id`) REFERENCES `affiliate_commission_tiers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_payment_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `account_type` VARCHAR(50) NOT NULL,
  `account_title` VARCHAR(150) NOT NULL,
  `institution_name` VARCHAR(150) NULL,
  `account_number` VARCHAR(100) NULL,
  `iban` VARCHAR(100) NULL,
  `wallet_phone` VARCHAR(50) NULL,
  `branch_name` VARCHAR(150) NULL,
  `instructions` VARCHAR(500) NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `created_by_admin_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `aff_pay_account_tenant_status_idx` (`tenant_id`, `status`),
  INDEX `aff_pay_account_default_idx` (`tenant_id`, `is_default`),
  INDEX `aff_pay_account_created_by_idx` (`created_by_admin_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `aff_pay_account_tenant_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_pay_account_creator_fkey`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_withdrawal_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `requested_amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `payment_account_id` INTEGER NULL,
  `payment_account_snapshot` JSON NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `request_note` VARCHAR(500) NULL,
  `admin_note` VARCHAR(500) NULL,
  `requested_by_admin_id` INTEGER NULL,
  `reviewed_by_admin_id` INTEGER NULL,
  `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `aff_withdraw_tenant_status_date_idx` (`tenant_id`, `status`, `requested_at`),
  INDEX `aff_withdraw_account_idx` (`payment_account_id`),
  INDEX `aff_withdraw_requested_by_idx` (`requested_by_admin_id`),
  INDEX `aff_withdraw_reviewed_by_idx` (`reviewed_by_admin_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `aff_withdraw_tenant_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_withdraw_account_fkey`
    FOREIGN KEY (`payment_account_id`) REFERENCES `affiliate_payment_accounts` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `aff_withdraw_requester_fkey`
    FOREIGN KEY (`requested_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `aff_withdraw_reviewer_fkey`
    FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `withdrawal_request_id` INTEGER NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `payment_method` VARCHAR(100) NULL,
  `transaction_reference` VARCHAR(150) NULL,
  `payment_date` DATE NOT NULL,
  `note` VARCHAR(500) NULL,
  `paid_by_admin_id` INTEGER NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'paid',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliate_payments_withdrawal_request_id_key` (`withdrawal_request_id`),
  INDEX `aff_payment_tenant_status_date_idx` (`tenant_id`, `status`, `payment_date`),
  INDEX `aff_payment_paid_by_idx` (`paid_by_admin_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `aff_payment_tenant_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_payment_withdrawal_fkey`
    FOREIGN KEY (`withdrawal_request_id`) REFERENCES `affiliate_withdrawal_requests` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `aff_payment_paid_by_fkey`
    FOREIGN KEY (`paid_by_admin_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
