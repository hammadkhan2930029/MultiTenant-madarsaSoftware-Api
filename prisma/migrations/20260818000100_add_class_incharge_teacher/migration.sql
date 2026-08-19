ALTER TABLE `classes`
  ADD COLUMN `incharge_teacher_id` INTEGER NULL;

CREATE INDEX `classes_incharge_teacher_id_idx`
  ON `classes`(`incharge_teacher_id`);

ALTER TABLE `classes`
  ADD CONSTRAINT `classes_incharge_teacher_id_fkey`
  FOREIGN KEY (`incharge_teacher_id`) REFERENCES `teachers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
