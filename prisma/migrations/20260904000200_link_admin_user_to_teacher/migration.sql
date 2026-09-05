ALTER TABLE `admins`
  ADD COLUMN `teacher_id` INTEGER NULL;

CREATE UNIQUE INDEX `admins_teacher_id_key`
  ON `admins`(`teacher_id`);

ALTER TABLE `admins`
  ADD CONSTRAINT `admins_teacher_id_fkey`
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
