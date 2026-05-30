CREATE TABLE `exam_results` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `studentId` INTEGER NOT NULL,
  `sessionId` INTEGER NOT NULL,
  `classId` INTEGER NOT NULL,
  `sectionId` INTEGER NULL,
  `examName` VARCHAR(150) NOT NULL DEFAULT 'امتحانی رزلٹ',
  `totalMarks` INTEGER NOT NULL,
  `obtainedMarks` INTEGER NOT NULL,
  `percentage` DECIMAL(5, 2) NOT NULL,
  `gradeTitle` VARCHAR(150) NULL,
  `gradeCode` VARCHAR(20) NULL,
  `remarks` VARCHAR(255) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `exam_results_studentId_sessionId_classId_sectionId_examName_key`(`studentId`, `sessionId`, `classId`, `sectionId`, `examName`),
  INDEX `exam_results_sessionId_classId_sectionId_idx`(`sessionId`, `classId`, `sectionId`),
  INDEX `exam_results_status_percentage_idx`(`status`, `percentage`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `exam_result_subjects` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `examResultId` INTEGER NOT NULL,
  `subjectId` INTEGER NOT NULL,
  `totalMarks` INTEGER NOT NULL,
  `obtainedMarks` INTEGER NOT NULL,
  `percentage` DECIMAL(5, 2) NOT NULL,
  `gradeTitle` VARCHAR(150) NULL,
  `gradeCode` VARCHAR(20) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `exam_result_subjects_examResultId_subjectId_key`(`examResultId`, `subjectId`),
  INDEX `exam_result_subjects_subjectId_idx`(`subjectId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `exam_results` ADD CONSTRAINT `exam_results_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exam_results` ADD CONSTRAINT `exam_results_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exam_results` ADD CONSTRAINT `exam_results_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exam_results` ADD CONSTRAINT `exam_results_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `exam_result_subjects` ADD CONSTRAINT `exam_result_subjects_examResultId_fkey` FOREIGN KEY (`examResultId`) REFERENCES `exam_results`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `exam_result_subjects` ADD CONSTRAINT `exam_result_subjects_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
