ALTER TABLE `exam_schedules`
  ADD COLUMN `section_id` INTEGER NULL;

CREATE INDEX `exam_schedules_section_id_idx` ON `exam_schedules`(`section_id`);
CREATE INDEX `exam_schedules_session_class_section_idx` ON `exam_schedules`(`sessionId`, `classId`, `section_id`);

ALTER TABLE `exam_schedules`
  ADD CONSTRAINT `exam_schedules_section_id_fkey`
  FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
