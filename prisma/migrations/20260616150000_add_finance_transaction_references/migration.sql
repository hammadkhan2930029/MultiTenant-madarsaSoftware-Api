ALTER TABLE `finance_transactions`
  ADD COLUMN `referenceType` VARCHAR(50) NULL,
  ADD COLUMN `referenceId` INTEGER NULL;

CREATE UNIQUE INDEX `finance_transactions_referenceType_referenceId_key` ON `finance_transactions`(`referenceType`, `referenceId`);
