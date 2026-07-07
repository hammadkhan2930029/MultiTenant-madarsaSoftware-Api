CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tenant_id` INT NULL,
  `actor_user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(100) NOT NULL,
  `target_id` INT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `ip_address` VARCHAR(100) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_tenant_id_idx` (`tenant_id`),
  INDEX `audit_logs_actor_user_id_idx` (`actor_user_id`),
  INDEX `audit_logs_module_action_idx` (`module`, `action`),
  INDEX `audit_logs_target_type_target_id_idx` (`target_type`, `target_id`),
  INDEX `audit_logs_created_at_idx` (`created_at`),
  CONSTRAINT `audit_logs_actor_user_id_fkey`
    FOREIGN KEY (`actor_user_id`) REFERENCES `admins` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
