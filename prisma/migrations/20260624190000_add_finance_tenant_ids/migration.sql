SET @default_tenant_id = (
  SELECT id
  FROM `Tenant`
  WHERE tenantCode = 'default'
  LIMIT 1
);

ALTER TABLE finance_heads
  ADD COLUMN tenant_id INT NULL;

UPDATE finance_heads
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE finance_heads
  DROP INDEX finance_heads_name_key,
  ADD INDEX finance_heads_tenant_id_idx (tenant_id),
  ADD UNIQUE INDEX finance_heads_tenant_id_name_key (tenant_id, name),
  ADD CONSTRAINT finance_heads_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE student_fee_vouchers
  ADD COLUMN tenant_id INT NULL;

UPDATE student_fee_vouchers sfv
INNER JOIN students s ON s.id = sfv.studentId
SET sfv.tenant_id = s.tenant_id
WHERE sfv.tenant_id IS NULL;

UPDATE student_fee_vouchers
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE student_fee_vouchers
  DROP INDEX student_fee_vouchers_voucherNo_key,
  ADD INDEX student_fee_vouchers_tenant_id_idx (tenant_id),
  ADD UNIQUE INDEX student_fee_vouchers_tenant_id_voucherNo_key (tenant_id, voucherNo),
  ADD CONSTRAINT student_fee_vouchers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE fund_collections
  ADD COLUMN tenant_id INT NULL;

UPDATE fund_collections
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE fund_collections
  ADD INDEX fund_collections_tenant_id_idx (tenant_id),
  ADD CONSTRAINT fund_collections_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE salary_entries
  ADD COLUMN tenant_id INT NULL;

UPDATE salary_entries se
INNER JOIN teachers t ON t.id = se.teacherId
SET se.tenant_id = t.tenant_id
WHERE se.tenant_id IS NULL;

UPDATE salary_entries
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE salary_entries
  ADD INDEX salary_entries_tenant_id_idx (tenant_id),
  ADD CONSTRAINT salary_entries_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE finance_transactions
  ADD COLUMN tenant_id INT NULL;

UPDATE finance_transactions
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE finance_transactions
  DROP INDEX finance_transactions_referenceType_referenceId_key,
  ADD INDEX finance_transactions_tenant_id_idx (tenant_id),
  ADD UNIQUE INDEX finance_transactions_tenant_id_referenceType_referenceId_key (tenant_id, referenceType, referenceId),
  ADD CONSTRAINT finance_transactions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE financial_records
  ADD COLUMN tenant_id INT NULL;

UPDATE financial_records fr
INNER JOIN admins a ON a.id = fr.createdById
SET fr.tenant_id = a.tenant_id
WHERE fr.tenant_id IS NULL;

UPDATE financial_records
SET tenant_id = @default_tenant_id
WHERE tenant_id IS NULL;

ALTER TABLE financial_records
  ADD INDEX financial_records_tenant_id_idx (tenant_id),
  ADD CONSTRAINT financial_records_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES `Tenant`(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
