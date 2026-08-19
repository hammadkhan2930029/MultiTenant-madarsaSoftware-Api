ALTER TABLE `roles`
  ADD COLUMN `class_scope_mode` VARCHAR(20) NOT NULL DEFAULT 'all';

CREATE TABLE `role_class_scopes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `branch_id` INTEGER NOT NULL,
  `role_id` INTEGER NOT NULL,
  `class_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `role_class_scopes_role_id_class_id_key` (`role_id`, `class_id`),
  INDEX `role_class_scopes_tenant_id_branch_id_idx` (`tenant_id`, `branch_id`),
  INDEX `role_class_scopes_class_id_idx` (`class_id`),
  CONSTRAINT `role_class_scopes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_class_scopes_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_class_scopes_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_class_scopes_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
