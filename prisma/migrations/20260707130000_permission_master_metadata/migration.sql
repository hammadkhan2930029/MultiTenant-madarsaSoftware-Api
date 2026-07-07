ALTER TABLE `permissions`
  ADD COLUMN `display_label` VARCHAR(150) NULL,
  ADD COLUMN `description` VARCHAR(255) NULL,
  ADD COLUMN `action` VARCHAR(50) NULL,
  ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0;

CREATE INDEX `permissions_module_name_action_idx` ON `permissions`(`module_name`, `action`);
