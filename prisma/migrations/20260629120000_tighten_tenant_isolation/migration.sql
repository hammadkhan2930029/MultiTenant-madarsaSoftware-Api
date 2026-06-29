SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

ALTER TABLE `suggestions`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `suggestions` s
LEFT JOIN `admins` a ON a.`id` = s.`adminId`
SET s.`tenant_id` = COALESCE(a.`tenant_id`, @default_tenant_id)
WHERE s.`tenant_id` IS NULL;

ALTER TABLE `suggestions`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `suggestions_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `suggestions_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `support_requests`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `support_requests` sr
LEFT JOIN `admins` a ON a.`id` = sr.`adminId`
SET sr.`tenant_id` = COALESCE(a.`tenant_id`, @default_tenant_id)
WHERE sr.`tenant_id` IS NULL;

ALTER TABLE `support_requests`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `support_requests_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `support_requests_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `student_schedules`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `student_schedules` ss
LEFT JOIN `classes` c ON c.`id` = ss.`classId`
LEFT JOIN `sections` sec ON sec.`id` = ss.`sectionId`
SET ss.`tenant_id` = COALESCE(c.`tenant_id`, sec.`tenant_id`, @default_tenant_id)
WHERE ss.`tenant_id` IS NULL;

ALTER TABLE `student_schedules`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `student_schedules_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `student_schedules_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `teacher_schedules`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `teacher_schedules` ts
LEFT JOIN `teachers` t ON t.`id` = ts.`teacherId`
LEFT JOIN `classes` c ON c.`id` = ts.`classId`
LEFT JOIN `sections` sec ON sec.`id` = ts.`sectionId`
SET ts.`tenant_id` = COALESCE(t.`tenant_id`, c.`tenant_id`, sec.`tenant_id`, @default_tenant_id)
WHERE ts.`tenant_id` IS NULL;

ALTER TABLE `teacher_schedules`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `teacher_schedules_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `teacher_schedules_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `student_parents`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `student_parents` sp
LEFT JOIN `students` s ON s.`id` = sp.`studentId`
LEFT JOIN `parents` p ON p.`id` = sp.`parentId`
SET sp.`tenant_id` = COALESCE(s.`tenant_id`, p.`tenant_id`, @default_tenant_id)
WHERE sp.`tenant_id` IS NULL;

ALTER TABLE `student_parents`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `student_parents_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `student_parents_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `student_attendance`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `student_attendance` sa
LEFT JOIN `students` s ON s.`id` = sa.`studentId`
LEFT JOIN `branches` b ON b.`id` = sa.`branchId`
LEFT JOIN `classes` c ON c.`id` = sa.`classId`
LEFT JOIN `sections` sec ON sec.`id` = sa.`sectionId`
SET sa.`tenant_id` = COALESCE(s.`tenant_id`, b.`tenant_id`, c.`tenant_id`, sec.`tenant_id`, @default_tenant_id)
WHERE sa.`tenant_id` IS NULL;

ALTER TABLE `student_attendance`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `student_attendance_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `student_attendance_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `teacher_attendance`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `teacher_attendance` ta
LEFT JOIN `teachers` t ON t.`id` = ta.`teacherId`
LEFT JOIN `branches` b ON b.`id` = ta.`branchId`
SET ta.`tenant_id` = COALESCE(t.`tenant_id`, b.`tenant_id`, @default_tenant_id)
WHERE ta.`tenant_id` IS NULL;

ALTER TABLE `teacher_attendance`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `teacher_attendance_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `teacher_attendance_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

ALTER TABLE `teacher_salary_increments`
  ADD COLUMN `tenant_id` INTEGER NULL AFTER `id`;

UPDATE `teacher_salary_increments` tsi
LEFT JOIN `teachers` t ON t.`id` = tsi.`teacherId`
SET tsi.`tenant_id` = COALESCE(t.`tenant_id`, @default_tenant_id)
WHERE tsi.`tenant_id` IS NULL;

ALTER TABLE `teacher_salary_increments`
  MODIFY `tenant_id` INTEGER NOT NULL,
  ADD INDEX `teacher_salary_increments_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `teacher_salary_increments_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;

UPDATE `madrassa_profiles` mp
LEFT JOIN `admins` a ON a.`id` = mp.`adminId`
SET mp.`tenant_id` = COALESCE(mp.`tenant_id`, a.`tenant_id`, @default_tenant_id)
WHERE mp.`tenant_id` IS NULL;

UPDATE `subjects` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `branches` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `classes` c LEFT JOIN `branches` b ON b.`id` = c.`branchId` SET c.`tenant_id` = COALESCE(c.`tenant_id`, b.`tenant_id`, @default_tenant_id) WHERE c.`tenant_id` IS NULL;
UPDATE `sections` s LEFT JOIN `classes` c ON c.`id` = s.`classId` SET s.`tenant_id` = COALESCE(s.`tenant_id`, c.`tenant_id`, @default_tenant_id) WHERE s.`tenant_id` IS NULL;
UPDATE `students` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `parents` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `student_class_assignments` sca LEFT JOIN `students` s ON s.`id` = sca.`studentId` SET sca.`tenant_id` = COALESCE(sca.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE sca.`tenant_id` IS NULL;
UPDATE `teachers` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `subjects` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `exam_schedules` es LEFT JOIN `classes` c ON c.`id` = es.`classId` LEFT JOIN `subjects` s ON s.`id` = es.`subjectId` SET es.`tenant_id` = COALESCE(es.`tenant_id`, c.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE es.`tenant_id` IS NULL;
UPDATE `result_grades` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `exam_results` er LEFT JOIN `students` s ON s.`id` = er.`studentId` LEFT JOIN `classes` c ON c.`id` = er.`classId` SET er.`tenant_id` = COALESCE(er.`tenant_id`, s.`tenant_id`, c.`tenant_id`, @default_tenant_id) WHERE er.`tenant_id` IS NULL;
UPDATE `exam_result_subjects` ers LEFT JOIN `exam_results` er ON er.`id` = ers.`examResultId` LEFT JOIN `subjects` s ON s.`id` = ers.`subjectId` SET ers.`tenant_id` = COALESCE(ers.`tenant_id`, er.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE ers.`tenant_id` IS NULL;
UPDATE `hifz_daily_entries` h LEFT JOIN `students` s ON s.`id` = h.`studentId` SET h.`tenant_id` = COALESCE(h.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE h.`tenant_id` IS NULL;
UPDATE `hifz_weekly_entries` h LEFT JOIN `students` s ON s.`id` = h.`studentId` SET h.`tenant_id` = COALESCE(h.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE h.`tenant_id` IS NULL;
UPDATE `hifz_monthly_entries` h LEFT JOIN `students` s ON s.`id` = h.`studentId` SET h.`tenant_id` = COALESCE(h.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE h.`tenant_id` IS NULL;
UPDATE `hifz_sipara_entries` h LEFT JOIN `students` s ON s.`id` = h.`studentId` SET h.`tenant_id` = COALESCE(h.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE h.`tenant_id` IS NULL;
UPDATE `finance_heads` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `student_fee_vouchers` sfv LEFT JOIN `students` s ON s.`id` = sfv.`studentId` SET sfv.`tenant_id` = COALESCE(sfv.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE sfv.`tenant_id` IS NULL;
UPDATE `fund_collections` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `salary_entries` se LEFT JOIN `teachers` t ON t.`id` = se.`teacherId` SET se.`tenant_id` = COALESCE(se.`tenant_id`, t.`tenant_id`, @default_tenant_id) WHERE se.`tenant_id` IS NULL;
UPDATE `finance_transactions` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `financial_records` fr LEFT JOIN `admins` a ON a.`id` = fr.`createdById` SET fr.`tenant_id` = COALESCE(fr.`tenant_id`, a.`tenant_id`, @default_tenant_id) WHERE fr.`tenant_id` IS NULL;
UPDATE `store_items` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `store_units` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `store_categories` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `store_suppliers` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `store_supplier_payments` sp LEFT JOIN `store_suppliers` s ON s.`id` = sp.`supplierId` SET sp.`tenant_id` = COALESCE(sp.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE sp.`tenant_id` IS NULL;
UPDATE `store_purchases` p LEFT JOIN `store_suppliers` s ON s.`id` = p.`supplierId` SET p.`tenant_id` = COALESCE(p.`tenant_id`, s.`tenant_id`, @default_tenant_id) WHERE p.`tenant_id` IS NULL;
UPDATE `store_purchase_items` pi LEFT JOIN `store_purchases` p ON p.`id` = pi.`purchaseId` LEFT JOIN `store_items` i ON i.`id` = pi.`itemId` SET pi.`tenant_id` = COALESCE(pi.`tenant_id`, p.`tenant_id`, i.`tenant_id`, @default_tenant_id) WHERE pi.`tenant_id` IS NULL;
UPDATE `store_stock_issues` si LEFT JOIN `store_items` i ON i.`id` = si.`itemId` SET si.`tenant_id` = COALESCE(si.`tenant_id`, i.`tenant_id`, @default_tenant_id) WHERE si.`tenant_id` IS NULL;
UPDATE `store_returns` r LEFT JOIN `store_stock_issues` si ON si.`id` = r.`stockIssueId` LEFT JOIN `store_items` i ON i.`id` = r.`itemId` SET r.`tenant_id` = COALESCE(r.`tenant_id`, si.`tenant_id`, i.`tenant_id`, @default_tenant_id) WHERE r.`tenant_id` IS NULL;
UPDATE `store_damaged_stock` ds LEFT JOIN `store_returns` r ON r.`id` = ds.`returnId` LEFT JOIN `store_items` i ON i.`id` = ds.`itemId` SET ds.`tenant_id` = COALESCE(ds.`tenant_id`, r.`tenant_id`, i.`tenant_id`, @default_tenant_id) WHERE ds.`tenant_id` IS NULL;
UPDATE `store_approval_logs` SET `tenant_id` = @default_tenant_id WHERE `tenant_id` IS NULL;
UPDATE `store_stock_adjustments` sa LEFT JOIN `store_items` i ON i.`id` = sa.`itemId` SET sa.`tenant_id` = COALESCE(sa.`tenant_id`, i.`tenant_id`, @default_tenant_id) WHERE sa.`tenant_id` IS NULL;

ALTER TABLE `madrassa_profiles` DROP FOREIGN KEY `madrassa_profiles_tenant_id_fkey`;
ALTER TABLE `subjects` DROP FOREIGN KEY `subjects_tenant_id_fkey`;
ALTER TABLE `branches` DROP FOREIGN KEY `branches_tenant_id_fkey`;
ALTER TABLE `classes` DROP FOREIGN KEY `classes_tenant_id_fkey`;
ALTER TABLE `sections` DROP FOREIGN KEY `sections_tenant_id_fkey`;
ALTER TABLE `students` DROP FOREIGN KEY `students_tenant_id_fkey`;
ALTER TABLE `parents` DROP FOREIGN KEY `parents_tenant_id_fkey`;
ALTER TABLE `student_class_assignments` DROP FOREIGN KEY `student_class_assignments_tenant_id_fkey`;
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_tenant_id_fkey`;
ALTER TABLE `exam_schedules` DROP FOREIGN KEY `exam_schedules_tenant_id_fkey`;
ALTER TABLE `result_grades` DROP FOREIGN KEY `result_grades_tenant_id_fkey`;
ALTER TABLE `exam_results` DROP FOREIGN KEY `exam_results_tenant_id_fkey`;
ALTER TABLE `exam_result_subjects` DROP FOREIGN KEY `exam_result_subjects_tenant_id_fkey`;
ALTER TABLE `hifz_daily_entries` DROP FOREIGN KEY `hifz_daily_entries_tenant_id_fkey`;
ALTER TABLE `hifz_weekly_entries` DROP FOREIGN KEY `hifz_weekly_entries_tenant_id_fkey`;
ALTER TABLE `hifz_monthly_entries` DROP FOREIGN KEY `hifz_monthly_entries_tenant_id_fkey`;
ALTER TABLE `hifz_sipara_entries` DROP FOREIGN KEY `hifz_sipara_entries_tenant_id_fkey`;
ALTER TABLE `finance_heads` DROP FOREIGN KEY `finance_heads_tenant_id_fkey`;
ALTER TABLE `student_fee_vouchers` DROP FOREIGN KEY `student_fee_vouchers_tenant_id_fkey`;
ALTER TABLE `fund_collections` DROP FOREIGN KEY `fund_collections_tenant_id_fkey`;
ALTER TABLE `salary_entries` DROP FOREIGN KEY `salary_entries_tenant_id_fkey`;
ALTER TABLE `finance_transactions` DROP FOREIGN KEY `finance_transactions_tenant_id_fkey`;
ALTER TABLE `financial_records` DROP FOREIGN KEY `financial_records_tenant_id_fkey`;
ALTER TABLE `store_items` DROP FOREIGN KEY `store_items_tenant_id_fkey`;
ALTER TABLE `store_units` DROP FOREIGN KEY `store_units_tenant_id_fkey`;
ALTER TABLE `store_categories` DROP FOREIGN KEY `store_categories_tenant_id_fkey`;
ALTER TABLE `store_suppliers` DROP FOREIGN KEY `store_suppliers_tenant_id_fkey`;
ALTER TABLE `store_supplier_payments` DROP FOREIGN KEY `store_supplier_payments_tenant_id_fkey`;
ALTER TABLE `store_purchases` DROP FOREIGN KEY `store_purchases_tenant_id_fkey`;
ALTER TABLE `store_purchase_items` DROP FOREIGN KEY `store_purchase_items_tenant_id_fkey`;
ALTER TABLE `store_stock_issues` DROP FOREIGN KEY `store_stock_issues_tenant_id_fkey`;
ALTER TABLE `store_returns` DROP FOREIGN KEY `store_returns_tenant_id_fkey`;
ALTER TABLE `store_damaged_stock` DROP FOREIGN KEY `store_damaged_stock_tenant_id_fkey`;
ALTER TABLE `store_approval_logs` DROP FOREIGN KEY `store_approval_logs_tenant_id_fkey`;
ALTER TABLE `store_stock_adjustments` DROP FOREIGN KEY `store_stock_adjustments_tenant_id_fkey`;

ALTER TABLE `madrassa_profiles` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `subjects` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `branches` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `classes` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `sections` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `students` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `parents` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `student_class_assignments` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `teachers` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `exam_schedules` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `result_grades` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `exam_results` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `exam_result_subjects` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `hifz_daily_entries` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `hifz_weekly_entries` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `hifz_monthly_entries` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `hifz_sipara_entries` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `finance_heads` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `student_fee_vouchers` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `fund_collections` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `salary_entries` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `finance_transactions` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `financial_records` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_items` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_units` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_categories` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_suppliers` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_supplier_payments` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_purchases` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_purchase_items` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_stock_issues` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_returns` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_damaged_stock` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_approval_logs` MODIFY `tenant_id` INTEGER NOT NULL;
ALTER TABLE `store_stock_adjustments` MODIFY `tenant_id` INTEGER NOT NULL;

ALTER TABLE `madrassa_profiles` ADD CONSTRAINT `madrassa_profiles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `branches` ADD CONSTRAINT `branches_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `classes` ADD CONSTRAINT `classes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `sections` ADD CONSTRAINT `sections_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `students` ADD CONSTRAINT `students_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `parents` ADD CONSTRAINT `parents_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `student_class_assignments` ADD CONSTRAINT `student_class_assignments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `exam_schedules` ADD CONSTRAINT `exam_schedules_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `result_grades` ADD CONSTRAINT `result_grades_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `exam_results` ADD CONSTRAINT `exam_results_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `exam_result_subjects` ADD CONSTRAINT `exam_result_subjects_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `hifz_daily_entries` ADD CONSTRAINT `hifz_daily_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `hifz_weekly_entries` ADD CONSTRAINT `hifz_weekly_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `hifz_monthly_entries` ADD CONSTRAINT `hifz_monthly_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `hifz_sipara_entries` ADD CONSTRAINT `hifz_sipara_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `finance_heads` ADD CONSTRAINT `finance_heads_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `student_fee_vouchers` ADD CONSTRAINT `student_fee_vouchers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `fund_collections` ADD CONSTRAINT `fund_collections_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `salary_entries` ADD CONSTRAINT `salary_entries_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `finance_transactions` ADD CONSTRAINT `finance_transactions_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `financial_records` ADD CONSTRAINT `financial_records_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_items` ADD CONSTRAINT `store_items_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_units` ADD CONSTRAINT `store_units_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_categories` ADD CONSTRAINT `store_categories_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_suppliers` ADD CONSTRAINT `store_suppliers_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_supplier_payments` ADD CONSTRAINT `store_supplier_payments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_purchases` ADD CONSTRAINT `store_purchases_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_purchase_items` ADD CONSTRAINT `store_purchase_items_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_stock_issues` ADD CONSTRAINT `store_stock_issues_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_returns` ADD CONSTRAINT `store_returns_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_damaged_stock` ADD CONSTRAINT `store_damaged_stock_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_approval_logs` ADD CONSTRAINT `store_approval_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
ALTER TABLE `store_stock_adjustments` ADD CONSTRAINT `store_stock_adjustments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON UPDATE CASCADE;
