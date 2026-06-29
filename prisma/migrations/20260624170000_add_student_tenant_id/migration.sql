ALTER TABLE `students`
  ADD COLUMN `tenant_id` INTEGER NULL;

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `students`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

ALTER TABLE `students`
  DROP INDEX `students_admissionNumber_key`;

ALTER TABLE `students`
  ADD UNIQUE INDEX `students_tenant_id_admissionNumber_key`(`tenant_id`, `admissionNumber`),
  ADD INDEX `students_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `students_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
