ALTER TABLE `teachers`
  ADD COLUMN `tenant_id` INTEGER NULL;

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `teachers`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

ALTER TABLE `teachers`
  DROP INDEX `teachers_phone_key`,
  DROP INDEX `teachers_cnic_key`;

ALTER TABLE `teachers`
  ADD UNIQUE INDEX `teachers_tenant_id_phone_key`(`tenant_id`, `phone`),
  ADD UNIQUE INDEX `teachers_tenant_id_cnic_key`(`tenant_id`, `cnic`),
  ADD INDEX `teachers_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `teachers_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
