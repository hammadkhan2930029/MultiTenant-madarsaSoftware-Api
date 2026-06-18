ALTER TABLE `admins`
  ADD COLUMN `owner_admin_id` INTEGER NULL,
  ADD INDEX `admins_owner_admin_id_idx`(`owner_admin_id`),
  ADD CONSTRAINT `admins_owner_admin_id_fkey`
    FOREIGN KEY (`owner_admin_id`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
