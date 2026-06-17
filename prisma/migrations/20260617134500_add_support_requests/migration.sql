CREATE TABLE IF NOT EXISTS `support_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `topic` VARCHAR(120) NOT NULL,
  `priority` VARCHAR(50) NOT NULL DEFAULT 'normal',
  `message` TEXT NOT NULL,
  `submitterName` VARCHAR(150) NULL,
  `submitterEmail` VARCHAR(150) NULL,
  `adminId` INTEGER NULL,
  `emailRecipient` VARCHAR(150) NULL,
  `emailStatus` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `emailError` VARCHAR(500) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'open',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `support_requests_status_idx`(`status`),
  INDEX `support_requests_priority_idx`(`priority`),
  INDEX `support_requests_adminId_idx`(`adminId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `support_requests_adminId_fkey`
    FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
