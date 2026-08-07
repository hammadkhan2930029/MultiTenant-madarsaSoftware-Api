ALTER TABLE `tenant`
  ADD COLUMN `referral_code` VARCHAR(20) NULL,
  ADD COLUMN `referred_by_tenant_id` INTEGER NULL,
  ADD COLUMN `referred_at` DATETIME(3) NULL;

UPDATE `tenant`
SET `referral_code` = CONCAT('MDS-', UPPER(SUBSTRING(SHA2(CONCAT('tenant-referral-', `id`), 256), 1, 8)))
WHERE `referral_code` IS NULL;

ALTER TABLE `tenant`
  MODIFY `referral_code` VARCHAR(20) NOT NULL,
  ADD UNIQUE INDEX `tenant_referral_code_key` (`referral_code`),
  ADD INDEX `tenant_referred_by_tenant_id_idx` (`referred_by_tenant_id`),
  ADD CONSTRAINT `tenant_referred_by_tenant_id_fkey`
    FOREIGN KEY (`referred_by_tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
