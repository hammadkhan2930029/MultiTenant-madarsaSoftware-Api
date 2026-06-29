SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

ALTER TABLE `subjects`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `subjects`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `subjects`
  DROP INDEX `subjects_name_key`,
  ADD UNIQUE INDEX `subjects_tenant_id_name_key`(`tenant_id`, `name`),
  ADD INDEX `subjects_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `subjects_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `exam_schedules`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `exam_schedules` es
LEFT JOIN `classes` c ON c.`id` = es.`classId`
LEFT JOIN `subjects` s ON s.`id` = es.`subjectId`
SET es.`tenant_id` = COALESCE(c.`tenant_id`, s.`tenant_id`, @default_tenant_id)
WHERE es.`tenant_id` IS NULL;

ALTER TABLE `exam_schedules`
  ADD INDEX `exam_schedules_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `exam_schedules_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `result_grades`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `result_grades`
SET `tenant_id` = @default_tenant_id
WHERE `tenant_id` IS NULL;

ALTER TABLE `result_grades`
  ADD INDEX `result_grades_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `result_grades_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `exam_results`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `exam_results` er
LEFT JOIN `students` s ON s.`id` = er.`studentId`
LEFT JOIN `classes` c ON c.`id` = er.`classId`
LEFT JOIN `sections` sec ON sec.`id` = er.`sectionId`
SET er.`tenant_id` = COALESCE(s.`tenant_id`, c.`tenant_id`, sec.`tenant_id`, @default_tenant_id)
WHERE er.`tenant_id` IS NULL;

ALTER TABLE `exam_results`
  ADD INDEX `exam_results_studentId_fkey_idx`(`studentId`),
  ADD INDEX `exam_results_sessionId_fkey_idx`(`sessionId`);

ALTER TABLE `exam_results`
  DROP INDEX `exam_results_studentId_sessionId_classId_sectionId_examName_key`,
  ADD UNIQUE INDEX `exam_results_tenant_student_exam_uq`(`tenant_id`, `studentId`, `sessionId`, `classId`, `sectionId`, `examName`),
  ADD INDEX `exam_results_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `exam_results_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `exam_result_subjects`
  ADD COLUMN `tenant_id` INTEGER NULL;

UPDATE `exam_result_subjects` ers
LEFT JOIN `exam_results` er ON er.`id` = ers.`examResultId`
LEFT JOIN `subjects` s ON s.`id` = ers.`subjectId`
SET ers.`tenant_id` = COALESCE(er.`tenant_id`, s.`tenant_id`, @default_tenant_id)
WHERE ers.`tenant_id` IS NULL;

ALTER TABLE `exam_result_subjects`
  ADD INDEX `exam_result_subjects_examResultId_fkey_idx`(`examResultId`);

ALTER TABLE `exam_result_subjects`
  DROP INDEX `exam_result_subjects_examResultId_subjectId_key`,
  ADD UNIQUE INDEX `exam_result_subjects_tenant_result_subject_uq`(`tenant_id`, `examResultId`, `subjectId`),
  ADD INDEX `exam_result_subjects_tenant_id_idx`(`tenant_id`),
  ADD CONSTRAINT `exam_result_subjects_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `Tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
