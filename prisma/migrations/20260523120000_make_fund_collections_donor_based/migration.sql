-- Make fund collections donor-based instead of student-bound.
ALTER TABLE `fund_collections` DROP FOREIGN KEY `fund_collections_studentId_fkey`;

ALTER TABLE `fund_collections`
    ADD COLUMN `donorName` VARCHAR(150) NOT NULL DEFAULT 'نام نامعلوم',
    ADD COLUMN `careOf` VARCHAR(150) NULL,
    ADD COLUMN `phone` VARCHAR(50) NULL,
    DROP COLUMN `studentId`;

ALTER TABLE `fund_collections` ALTER `donorName` DROP DEFAULT;
