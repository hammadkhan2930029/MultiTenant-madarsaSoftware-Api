ALTER TABLE `parents`
  ADD COLUMN `tenant_id` INTEGER NULL;

ALTER TABLE `parents`
  ADD COLUMN IF NOT EXISTS `familyNumber` VARCHAR(100) NULL;

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `parents` p
LEFT JOIN (
  SELECT sp.`parentId`, MIN(s.`tenant_id`) AS `tenant_id`
  FROM `student_parents` sp
  INNER JOIN `students` s ON s.`id` = sp.`studentId`
  WHERE s.`tenant_id` IS NOT NULL
  GROUP BY sp.`parentId`
) linked_students ON linked_students.`parentId` = p.`id`
SET p.`tenant_id` = COALESCE(
  linked_students.`tenant_id`,
  (SELECT `id` FROM `Tenant` WHERE `tenantCode` = 'default' LIMIT 1)
)
WHERE p.`tenant_id` IS NULL;

SET @drop_parent_family_index = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE `parents` DROP INDEX `parents_familyNumber_key`',
    'SELECT 1'
  )
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'parents'
    AND index_name = 'parents_familyNumber_key'
);
PREPARE drop_parent_family_index_stmt FROM @drop_parent_family_index;
EXECUTE drop_parent_family_index_stmt;
DEALLOCATE PREPARE drop_parent_family_index_stmt;

ALTER TABLE `parents`
  ADD UNIQUE INDEX `parents_tenant_id_familyNumber_key`(`tenant_id`, `familyNumber`),
  ADD INDEX `parents_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `parents_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
