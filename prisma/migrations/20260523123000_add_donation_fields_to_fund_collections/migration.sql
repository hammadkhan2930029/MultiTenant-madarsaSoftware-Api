-- Store fund collections as donation entries.
ALTER TABLE `fund_collections` DROP FOREIGN KEY `fund_collections_financeHeadId_fkey`;

ALTER TABLE `fund_collections`
    ADD COLUMN `paymentMode` VARCHAR(50) NOT NULL DEFAULT 'نقد',
    ADD COLUMN `donationType` VARCHAR(100) NOT NULL DEFAULT 'صدقات واجبہ',
    ADD COLUMN `donationSubType` VARCHAR(100) NOT NULL DEFAULT 'زکوٰۃ',
    ADD COLUMN `purpose` VARCHAR(255) NULL,
    ADD COLUMN `receiptNo` VARCHAR(100) NULL,
    ADD COLUMN `details` VARCHAR(255) NULL,
    DROP COLUMN `financeHeadId`;

ALTER TABLE `fund_collections` ALTER `paymentMode` DROP DEFAULT;
ALTER TABLE `fund_collections` ALTER `donationType` DROP DEFAULT;
ALTER TABLE `fund_collections` ALTER `donationSubType` DROP DEFAULT;
