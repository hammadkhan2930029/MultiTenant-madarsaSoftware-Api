ALTER TABLE `teachers`
  ADD COLUMN `shiftId` INTEGER NULL;

CREATE INDEX `teachers_shiftId_idx` ON `teachers`(`shiftId`);

ALTER TABLE `teachers`
  ADD CONSTRAINT `teachers_shiftId_fkey`
  FOREIGN KEY (`shiftId`) REFERENCES `shifts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
