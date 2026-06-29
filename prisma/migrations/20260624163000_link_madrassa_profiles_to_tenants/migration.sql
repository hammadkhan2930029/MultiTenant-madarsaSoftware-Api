ALTER TABLE `madrassa_profiles`
  ADD COLUMN `tenant_id` INTEGER NULL;

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `madrassa_profiles`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL
ORDER BY `id` ASC
LIMIT 1;

CREATE UNIQUE INDEX `madrassa_profiles_tenant_id_key` ON `madrassa_profiles`(`tenant_id`);

ALTER TABLE `madrassa_profiles`
  ADD CONSTRAINT `madrassa_profiles_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
