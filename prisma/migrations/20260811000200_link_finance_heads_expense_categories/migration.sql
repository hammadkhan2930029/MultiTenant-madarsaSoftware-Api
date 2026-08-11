ALTER TABLE `finance_heads`
  ADD COLUMN `expense_category_id` INTEGER NULL;

CREATE INDEX `finance_heads_expense_category_id_idx`
  ON `finance_heads`(`expense_category_id`);

ALTER TABLE `finance_heads`
  ADD CONSTRAINT `finance_heads_expense_category_id_fkey`
  FOREIGN KEY (`expense_category_id`) REFERENCES `finance_expense_categories`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
