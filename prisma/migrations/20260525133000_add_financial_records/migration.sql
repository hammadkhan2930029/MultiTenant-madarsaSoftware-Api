CREATE TABLE `financial_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(20) NOT NULL,
    `category` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `financial_records_type_date_status_idx`(`type`, `date`, `status`),
    INDEX `financial_records_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `financial_records` ADD CONSTRAINT `financial_records_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
