SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

ALTER TABLE `hifz_daily_entries`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `hifz_daily_entries` h
LEFT JOIN `students` s ON s.`id` = h.`studentId`
SET h.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE h.`tenant_id` IS NULL;

ALTER TABLE `hifz_daily_entries`
  ADD INDEX `hifz_daily_entries_studentId_fkey_idx`(`studentId`);

ALTER TABLE `hifz_daily_entries`
  DROP INDEX `hifz_daily_entries_studentId_date_key`,
  ADD UNIQUE INDEX `hifz_daily_tenant_student_date_uq`(`tenant_id`, `studentId`, `date`),
  ADD INDEX `hifz_daily_entries_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `hifz_daily_entries_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `hifz_weekly_entries`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `hifz_weekly_entries` h
LEFT JOIN `students` s ON s.`id` = h.`studentId`
SET h.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE h.`tenant_id` IS NULL;

ALTER TABLE `hifz_weekly_entries`
  ADD INDEX `hifz_weekly_entries_studentId_fkey_idx`(`studentId`);

ALTER TABLE `hifz_weekly_entries`
  DROP INDEX `hifz_weekly_entries_studentId_weekStartDate_weekEndDate_key`,
  ADD UNIQUE INDEX `hifz_weekly_tenant_student_week_uq`(`tenant_id`, `studentId`, `weekStartDate`, `weekEndDate`),
  ADD INDEX `hifz_weekly_entries_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `hifz_weekly_entries_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `hifz_monthly_entries`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `hifz_monthly_entries` h
LEFT JOIN `students` s ON s.`id` = h.`studentId`
SET h.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE h.`tenant_id` IS NULL;

ALTER TABLE `hifz_monthly_entries`
  ADD INDEX `hifz_monthly_entries_studentId_fkey_idx`(`studentId`);

ALTER TABLE `hifz_monthly_entries`
  DROP INDEX `hifz_monthly_entries_studentId_month_year_key`,
  ADD UNIQUE INDEX `hifz_monthly_tenant_student_month_uq`(`tenant_id`, `studentId`, `month`, `year`),
  ADD INDEX `hifz_monthly_entries_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `hifz_monthly_entries_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `hifz_sipara_entries`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `hifz_sipara_entries` h
LEFT JOIN `students` s ON s.`id` = h.`studentId`
SET h.`tenant_id` = COALESCE(s.`tenant_id`, @default_tenant_id)
WHERE h.`tenant_id` IS NULL;

ALTER TABLE `hifz_sipara_entries`
  ADD INDEX `hifz_sipara_entries_studentId_fkey_idx`(`studentId`);

ALTER TABLE `hifz_sipara_entries`
  DROP INDEX `hifz_sipara_entries_studentId_siparaNumber_key`,
  ADD UNIQUE INDEX `hifz_sipara_tenant_student_sipara_uq`(`tenant_id`, `studentId`, `siparaNumber`),
  ADD INDEX `hifz_sipara_entries_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `hifz_sipara_entries_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
