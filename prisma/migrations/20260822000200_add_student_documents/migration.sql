CREATE TABLE `student_documents` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenant_id` INTEGER NOT NULL,
  `branch_id` INTEGER NULL,
  `student_id` INTEGER NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `student_documents_tenant_id_idx` (`tenant_id`),
  INDEX `student_documents_branch_id_idx` (`branch_id`),
  INDEX `student_documents_student_id_idx` (`student_id`),
  INDEX `student_documents_tenant_id_branch_id_student_id_idx` (`tenant_id`, `branch_id`, `student_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `student_documents_tenant_id_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `student_documents_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `student_documents_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
