ALTER TABLE `admins`
  ADD COLUMN `tenant_id` INTEGER NULL;

ALTER TABLE `admins`
  DROP INDEX `admins_email_key`,
  DROP INDEX `admins_username_key`;

ALTER TABLE `admins`
  ADD UNIQUE INDEX `admins_tenant_id_email_key`(`tenant_id`, `email`),
  ADD UNIQUE INDEX `admins_tenant_id_username_key`(`tenant_id`, `username`),
  ADD INDEX `admins_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `admins_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
