CREATE TABLE IF NOT EXISTS `department_head_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `department_id` INT NOT NULL,
  `tenant_id` INT NOT NULL,
  `branch_id` INT NULL,
  `branch_scope_key` VARCHAR(50) NOT NULL DEFAULT 'tenant',
  `teacher_id` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `dept_head_scope_key`
    (`department_id`, `tenant_id`, `branch_scope_key`),
  INDEX `dept_head_tenant_idx` (`tenant_id`),
  INDEX `dept_head_branch_idx` (`branch_id`),
  INDEX `dept_head_teacher_idx` (`teacher_id`),
  CONSTRAINT `dept_head_department_fkey`
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `dept_head_tenant_fkey`
    FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `dept_head_branch_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `dept_head_teacher_fkey`
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
