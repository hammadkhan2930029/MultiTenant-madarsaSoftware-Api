CREATE TABLE IF NOT EXISTS `suggestions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `priority` VARCHAR(50) NOT NULL DEFAULT 'normal',
  `description` TEXT NOT NULL,
  `submitterName` VARCHAR(150) NULL,
  `submitterEmail` VARCHAR(150) NULL,
  `adminId` INTEGER NULL,
  `emailRecipient` VARCHAR(150) NULL,
  `emailStatus` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `emailError` VARCHAR(500) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'new',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `suggestions_status_idx`(`status`),
  INDEX `suggestions_priority_idx`(`priority`),
  INDEX `suggestions_adminId_idx`(`adminId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `suggestions_adminId_fkey`
    FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
