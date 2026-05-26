CREATE TABLE `exam_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `examName` VARCHAR(150) NOT NULL,
    `sessionId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,
    `subjectId` INTEGER NOT NULL,
    `examDate` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(10) NOT NULL,
    `endTime` VARCHAR(10) NOT NULL,
    `totalMarks` INTEGER NULL,
    `room` VARCHAR(100) NULL,
    `invigilator` VARCHAR(150) NULL,
    `notes` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exam_schedules_sessionId_classId_subjectId_idx`(`sessionId`, `classId`, `subjectId`),
    INDEX `exam_schedules_examDate_status_idx`(`examDate`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `exam_schedules` ADD CONSTRAINT `exam_schedules_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exam_schedules` ADD CONSTRAINT `exam_schedules_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `exam_schedules` ADD CONSTRAINT `exam_schedules_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
