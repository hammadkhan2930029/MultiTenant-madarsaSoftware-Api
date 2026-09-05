ALTER TABLE `parents`
  ADD COLUMN `registration_number` VARCHAR(100) NULL;

UPDATE `parents`
SET `registration_number` = CONCAT('PAR-', LPAD(`id`, 6, '0'))
WHERE `registration_number` IS NULL;

CREATE UNIQUE INDEX `parents_tenant_id_registration_number_key`
  ON `parents`(`tenant_id`, `registration_number`);
