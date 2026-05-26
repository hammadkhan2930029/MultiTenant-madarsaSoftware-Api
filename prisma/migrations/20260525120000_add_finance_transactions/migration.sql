CREATE TABLE `finance_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `financeHeadId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `slipNo` VARCHAR(100) NULL,
    `details` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `finance_transactions_type_transactionDate_idx`(`type`, `transactionDate`),
    INDEX `finance_transactions_financeHeadId_idx`(`financeHeadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `finance_transactions`
    ADD CONSTRAINT `finance_transactions_financeHeadId_fkey`
    FOREIGN KEY (`financeHeadId`) REFERENCES `finance_heads`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
