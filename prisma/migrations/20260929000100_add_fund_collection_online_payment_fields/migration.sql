ALTER TABLE `fund_collections`
  ADD COLUMN `online_wallet_or_bank` VARCHAR(150) NULL,
  ADD COLUMN `online_reference_no` VARCHAR(100) NULL,
  ADD COLUMN `payment_proof_url` VARCHAR(255) NULL;
