CREATE TABLE `role_teacher_class_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `branch_id` INTEGER NOT NULL,
  `role_id` INTEGER NOT NULL,
  `teacher_id` INTEGER NOT NULL,
  `class_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `role_teacher_class_assignments_role_id_class_id_key`(`role_id`, `class_id`),
  INDEX `role_teacher_class_assignments_tenant_id_branch_id_idx`(`tenant_id`, `branch_id`),
  INDEX `role_teacher_class_assignments_teacher_id_idx`(`teacher_id`),
  INDEX `role_teacher_class_assignments_class_id_idx`(`class_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `role_teacher_class_assignments_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_teacher_class_assignments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_teacher_class_assignments_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_teacher_class_assignments_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_teacher_class_assignments_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
