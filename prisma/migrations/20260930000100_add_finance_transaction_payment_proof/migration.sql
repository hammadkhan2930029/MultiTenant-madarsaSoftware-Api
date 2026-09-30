ALTER TABLE `finance_transactions`
  ADD COLUMN `cheque_bank_name` VARCHAR(150) NULL,
  ADD COLUMN `cheque_branch_code` VARCHAR(50) NULL,
  ADD COLUMN `cheque_number` VARCHAR(100) NULL,
  ADD COLUMN `cheque_date` DATETIME NULL,
  ADD COLUMN `online_wallet_or_bank` VARCHAR(150) NULL,
  ADD COLUMN `online_reference_no` VARCHAR(100) NULL,
  ADD COLUMN `payment_proof_url` VARCHAR(255) NULL;
