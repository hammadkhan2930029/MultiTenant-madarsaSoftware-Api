ALTER TABLE `teacher_assignments`
  MODIFY `subject_id` INTEGER NULL,
  MODIFY `class_id` INTEGER NULL,
  MODIFY `section_id` INTEGER NULL,
  MODIFY `responsibility_id` INTEGER NULL,
  ADD COLUMN `note` VARCHAR(255) NULL;
