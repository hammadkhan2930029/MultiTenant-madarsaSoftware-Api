CREATE TABLE `student_fee_vouchers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voucherNo` VARCHAR(100) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `feeMonth` INTEGER NOT NULL,
    `feeYear` INTEGER NOT NULL,
    `monthlyFee` DECIMAL(10, 2) NOT NULL,
    `admissionFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `arrears` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `fine` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `paidAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dueAmount` DECIMAL(10, 2) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `paidDate` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(50) NULL,
    `remarks` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_fee_vouchers_voucherNo_key`(`voucherNo`),
    UNIQUE INDEX `student_fee_vouchers_studentId_feeMonth_feeYear_key`(`studentId`, `feeMonth`, `feeYear`),
    INDEX `student_fee_vouchers_feeMonth_feeYear_status_idx`(`feeMonth`, `feeYear`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `student_fee_vouchers`
    ADD CONSTRAINT `student_fee_vouchers_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `students`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
