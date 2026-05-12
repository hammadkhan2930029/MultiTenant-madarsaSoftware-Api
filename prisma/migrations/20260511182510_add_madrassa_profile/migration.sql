-- CreateTable
CREATE TABLE `madrassa_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone1` VARCHAR(50) NULL,
    `phone2` VARCHAR(50) NULL,
    `address` VARCHAR(255) NULL,
    `branch` VARCHAR(150) NULL,
    `city` VARCHAR(150) NULL,
    `familyNoSeq` VARCHAR(100) NULL,
    `regNo` VARCHAR(100) NULL,
    `logoUrl` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `madrassa_profiles_adminId_key`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `madrassa_profiles` ADD CONSTRAINT `madrassa_profiles_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
