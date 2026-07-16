CREATE INDEX `student_att_tenant_branch_date_idx`
  ON `student_attendance`(`tenant_id`, `branchId`, `date`);

CREATE INDEX `student_att_tenant_branch_status_date_idx`
  ON `student_attendance`(`tenant_id`, `branchId`, `status`, `date`);

CREATE INDEX `teacher_att_tenant_branch_date_idx`
  ON `teacher_attendance`(`tenant_id`, `branchId`, `date`);

CREATE INDEX `teacher_att_tenant_branch_status_date_idx`
  ON `teacher_attendance`(`tenant_id`, `branchId`, `status`, `date`);

CREATE INDEX `fee_vouchers_tenant_status_paid_date_idx`
  ON `student_fee_vouchers`(`tenant_id`, `status`, `paidDate`);

CREATE INDEX `fee_vouchers_tenant_status_due_date_idx`
  ON `student_fee_vouchers`(`tenant_id`, `status`, `dueDate`);

CREATE INDEX `fee_vouchers_tenant_period_status_idx`
  ON `student_fee_vouchers`(`tenant_id`, `feeMonth`, `feeYear`, `status`);

CREATE INDEX `funds_tenant_branch_status_payment_idx`
  ON `fund_collections`(`tenant_id`, `branch_id`, `status`, `paymentDate`);

CREATE INDEX `salary_tenant_branch_status_payment_idx`
  ON `salary_entries`(`tenant_id`, `branch_id`, `status`, `paymentDate`);

CREATE INDEX `salary_tenant_branch_teacher_period_idx`
  ON `salary_entries`(`tenant_id`, `branch_id`, `teacherId`, `salaryMonth`, `salaryYear`);

CREATE INDEX `finance_tx_tenant_branch_status_date_idx`
  ON `finance_transactions`(`tenant_id`, `branch_id`, `status`, `transactionDate`);

CREATE INDEX `finance_tx_tenant_branch_type_date_idx`
  ON `finance_transactions`(`tenant_id`, `branch_id`, `type`, `transactionDate`);

CREATE INDEX `financial_records_tenant_branch_status_date_idx`
  ON `financial_records`(`tenant_id`, `branch_id`, `status`, `date`);

CREATE INDEX `financial_records_tenant_branch_type_date_idx`
  ON `financial_records`(`tenant_id`, `branch_id`, `type`, `date`, `status`);

CREATE INDEX `supplier_pay_tenant_branch_status_date_idx`
  ON `store_supplier_payments`(`tenant_id`, `branch_id`, `status`, `paymentDate`);

CREATE INDEX `supplier_pay_tenant_branch_supplier_date_idx`
  ON `store_supplier_payments`(`tenant_id`, `branch_id`, `supplierId`, `paymentDate`);

CREATE INDEX `purchases_tenant_branch_status_date_idx`
  ON `store_purchases`(`tenant_id`, `branch_id`, `status`, `purchaseDate`);

CREATE INDEX `purchases_tenant_branch_approval_date_idx`
  ON `store_purchases`(`tenant_id`, `branch_id`, `approvalStatus`, `purchaseDate`);

CREATE INDEX `purchases_tenant_branch_supplier_date_idx`
  ON `store_purchases`(`tenant_id`, `branch_id`, `supplierId`, `purchaseDate`);

CREATE INDEX `purchase_items_tenant_branch_item_idx`
  ON `store_purchase_items`(`tenant_id`, `branch_id`, `itemId`);

CREATE INDEX `purchase_items_tenant_branch_purchase_idx`
  ON `store_purchase_items`(`tenant_id`, `branch_id`, `purchaseId`);

CREATE INDEX `stock_issues_tenant_branch_status_date_idx`
  ON `store_stock_issues`(`tenant_id`, `branch_id`, `status`, `issueDate`);

CREATE INDEX `stock_issues_tenant_branch_approval_date_idx`
  ON `store_stock_issues`(`tenant_id`, `branch_id`, `approvalStatus`, `issueDate`);

CREATE INDEX `stock_issues_tenant_branch_item_date_idx`
  ON `store_stock_issues`(`tenant_id`, `branch_id`, `itemId`, `issueDate`);

CREATE INDEX `store_returns_tenant_branch_status_date_idx`
  ON `store_returns`(`tenant_id`, `branch_id`, `status`, `createdAt`);

CREATE INDEX `store_returns_tenant_branch_item_date_idx`
  ON `store_returns`(`tenant_id`, `branch_id`, `itemId`, `createdAt`);

CREATE INDEX `damaged_stock_tenant_branch_status_date_idx`
  ON `store_damaged_stock`(`tenant_id`, `branch_id`, `status`, `date`);

CREATE INDEX `damaged_stock_tenant_branch_approval_date_idx`
  ON `store_damaged_stock`(`tenant_id`, `branch_id`, `approvalStatus`, `date`);

CREATE INDEX `damaged_stock_tenant_branch_item_date_idx`
  ON `store_damaged_stock`(`tenant_id`, `branch_id`, `itemId`, `date`);

CREATE INDEX `stock_adjust_tenant_branch_item_idx`
  ON `store_stock_adjustments`(`tenant_id`, `branch_id`, `itemId`);

CREATE INDEX `stock_adjust_tenant_branch_approval_idx`
  ON `store_stock_adjustments`(`tenant_id`, `branch_id`, `approvalStatus`);
