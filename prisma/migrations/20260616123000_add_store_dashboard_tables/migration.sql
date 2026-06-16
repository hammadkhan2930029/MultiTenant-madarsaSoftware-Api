CREATE TABLE `store_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(150) NOT NULL,
    `category` VARCHAR(150) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `itemCode` VARCHAR(100) NOT NULL,
    `barcode` VARCHAR(100) NULL,
    `openingStock` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currentStock` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `purchasePrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_items_itemCode_key`(`itemCode`),
    INDEX `store_items_category_idx`(`category`),
    INDEX `store_items_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierName` VARCHAR(150) NOT NULL,
    `mobileNumber` VARCHAR(50) NULL,
    `address` VARCHAR(255) NULL,
    `shopName` VARCHAR(150) NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `store_suppliers_supplierName_key`(`supplierName`),
    INDEX `store_suppliers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_supplier_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `paymentMethod` VARCHAR(50) NULL,
    `note` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_supplier_payments_supplierId_idx`(`supplierId`),
    INDEX `store_supplier_payments_paymentDate_status_idx`(`paymentDate`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_purchases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseDate` DATETIME(3) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `invoiceNumber` VARCHAR(100) NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(50) NULL,
    `invoiceImage` VARCHAR(255) NULL,
    `approvalStatus` VARCHAR(50) NOT NULL DEFAULT 'approved',
    `financeTransactionId` INTEGER NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_purchases_purchaseDate_status_idx`(`purchaseDate`, `status`),
    INDEX `store_purchases_supplierId_idx`(`supplierId`),
    INDEX `store_purchases_financeTransactionId_idx`(`financeTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_purchase_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_purchase_items_purchaseId_idx`(`purchaseId`),
    INDEX `store_purchase_items_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_stock_issues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `issueDate` DATETIME(3) NOT NULL,
    `itemId` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `returnedQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `department` VARCHAR(150) NOT NULL,
    `receiverName` VARCHAR(150) NOT NULL,
    `purpose` VARCHAR(255) NULL,
    `issuedBy` VARCHAR(150) NOT NULL,
    `receiverSignature` VARCHAR(255) NULL,
    `approvalStatus` VARCHAR(50) NOT NULL DEFAULT 'approved',
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_stock_issues_itemId_idx`(`itemId`),
    INDEX `store_stock_issues_issueDate_status_idx`(`issueDate`, `status`),
    INDEX `store_stock_issues_approvalStatus_idx`(`approvalStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_returns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stockIssueId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `returnQuantity` DECIMAL(10, 2) NOT NULL,
    `condition` VARCHAR(50) NOT NULL,
    `addToStock` BOOLEAN NOT NULL DEFAULT true,
    `note` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_returns_stockIssueId_idx`(`stockIssueId`),
    INDEX `store_returns_itemId_idx`(`itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `store_damaged_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `returnId` INTEGER NULL,
    `itemId` INTEGER NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responsiblePerson` VARCHAR(150) NULL,
    `amountLoss` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `approvalStatus` VARCHAR(50) NOT NULL DEFAULT 'approved',
    `note` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `store_damaged_stock_returnId_idx`(`returnId`),
    INDEX `store_damaged_stock_itemId_idx`(`itemId`),
    INDEX `store_damaged_stock_date_status_idx`(`date`, `status`),
    INDEX `store_damaged_stock_approvalStatus_idx`(`approvalStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `store_purchases` ADD CONSTRAINT `store_purchases_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `store_suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_supplier_payments` ADD CONSTRAINT `store_supplier_payments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `store_suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_purchase_items` ADD CONSTRAINT `store_purchase_items_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `store_purchases`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_purchase_items` ADD CONSTRAINT `store_purchase_items_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `store_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_stock_issues` ADD CONSTRAINT `store_stock_issues_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `store_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_returns` ADD CONSTRAINT `store_returns_stockIssueId_fkey` FOREIGN KEY (`stockIssueId`) REFERENCES `store_stock_issues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_returns` ADD CONSTRAINT `store_returns_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `store_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `store_damaged_stock` ADD CONSTRAINT `store_damaged_stock_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `store_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
