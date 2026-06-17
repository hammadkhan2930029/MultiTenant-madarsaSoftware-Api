CREATE TABLE IF NOT EXISTS `teacher_salary_increments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `teacherId` INTEGER NOT NULL,
  `previousSalary` DECIMAL(10, 2) NOT NULL,
  `incrementAmount` DECIMAL(10, 2) NOT NULL,
  `newSalary` DECIMAL(10, 2) NOT NULL,
  `effectiveDate` VARCHAR(20) NOT NULL,
  `reason` VARCHAR(255) NULL,
  `createdById` INTEGER NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `teacher_salary_increments_teacherId_idx`(`teacherId`),
  INDEX `teacher_salary_increments_effectiveDate_idx`(`effectiveDate`),
  INDEX `teacher_salary_increments_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`),
  CONSTRAINT `teacher_salary_increments_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_salary_increments_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
