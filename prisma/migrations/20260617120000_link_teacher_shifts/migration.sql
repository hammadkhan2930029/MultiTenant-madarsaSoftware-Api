CREATE TABLE IF NOT EXISTS `shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `startTime` VARCHAR(10) NOT NULL,
    `endTime` VARCHAR(10) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shifts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `teachers`
  ADD COLUMN `shiftId` INTEGER NULL;

CREATE INDEX `teachers_shiftId_idx` ON `teachers`(`shiftId`);

ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_shiftId_fkey`
  FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
