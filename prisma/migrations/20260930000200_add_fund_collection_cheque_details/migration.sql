ALTER TABLE `fund_collections`
  ADD COLUMN `cheque_bank_name` VARCHAR(150) NULL,
  ADD COLUMN `cheque_branch_code` VARCHAR(50) NULL,
  ADD COLUMN `cheque_number` VARCHAR(100) NULL;
