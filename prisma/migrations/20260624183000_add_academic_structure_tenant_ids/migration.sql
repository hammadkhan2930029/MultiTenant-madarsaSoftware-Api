ALTER TABLE `branches`
  ADD COLUMN `tenant_id` INTEGER NULL;

ALTER TABLE `classes`
  ADD COLUMN `tenant_id` INTEGER NULL;

ALTER TABLE `sections`
  ADD COLUMN `tenant_id` INTEGER NULL;

ALTER TABLE `student_class_assignments`
  ADD COLUMN `tenant_id` INTEGER NULL;

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `branches`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

UPDATE `classes`
SET `tenant_id` = (
  SELECT `tenant_id`
  FROM `branches`
  WHERE `branches`.`id` = `classes`.`branchId`
  LIMIT 1
)
WHERE `tenant_id` IS NULL;

UPDATE `classes`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

UPDATE `sections`
SET `tenant_id` = (
  SELECT `tenant_id`
  FROM `classes`
  WHERE `classes`.`id` = `sections`.`classId`
  LIMIT 1
)
WHERE `tenant_id` IS NULL;

UPDATE `sections`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

UPDATE `student_class_assignments`
SET `tenant_id` = (
  SELECT `tenant_id`
  FROM `students`
  WHERE `students`.`id` = `student_class_assignments`.`studentId`
  LIMIT 1
)
WHERE `tenant_id` IS NULL;

UPDATE `student_class_assignments`
SET `tenant_id` = (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
WHERE `tenant_id` IS NULL;

ALTER TABLE `branches`
  DROP INDEX `branches_name_key`,
  DROP INDEX `branches_code_key`;

ALTER TABLE `branches`
  ADD UNIQUE INDEX `branches_tenant_id_name_key`(`tenant_id`, `name`),
  ADD UNIQUE INDEX `branches_tenant_id_code_key`(`tenant_id`, `code`),
  ADD INDEX `branches_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `branches_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `classes`
  ADD INDEX `classes_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `classes_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `sections`
  ADD INDEX `sections_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `sections_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_class_assignments`
  ADD INDEX `student_class_assignments_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `student_class_assignments_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
