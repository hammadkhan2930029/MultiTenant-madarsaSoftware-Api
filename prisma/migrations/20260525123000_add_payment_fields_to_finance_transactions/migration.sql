ALTER TABLE `finance_transactions`
    ADD COLUMN `paymentMode` VARCHAR(50) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(50) NULL;
