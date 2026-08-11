ALTER TABLE `exam_schedules`
  ADD COLUMN `invigilator_teacher_id` INTEGER NULL;

CREATE INDEX `exam_schedules_invigilator_teacher_id_idx`
  ON `exam_schedules`(`invigilator_teacher_id`);

ALTER TABLE `exam_schedules`
  ADD CONSTRAINT `exam_schedules_invigilator_teacher_id_fkey`
  FOREIGN KEY (`invigilator_teacher_id`) REFERENCES `teachers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
