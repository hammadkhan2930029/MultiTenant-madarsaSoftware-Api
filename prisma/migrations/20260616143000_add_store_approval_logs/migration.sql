CREATE TABLE `store_approval_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleType` VARCHAR(50) NOT NULL,
    `recordId` INTEGER NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `approvedBy` VARCHAR(150) NULL,
    `remarks` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `store_approval_logs_moduleType_recordId_idx`(`moduleType`, `recordId`),
    INDEX `store_approval_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_stock_adjustments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemId` INTEGER NOT NULL,
    `adjustmentType` VARCHAR(20) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `previousStock` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `adjustedStock` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `reason` VARCHAR(255) NULL,
    `approvalStatus` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_stock_adjustments_itemId_idx`(`itemId`),
    INDEX `store_stock_adjustments_approvalStatus_idx`(`approvalStatus`),
    INDEX `store_stock_adjustments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `store_stock_adjustments` ADD CONSTRAINT `store_stock_adjustments_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `store_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
