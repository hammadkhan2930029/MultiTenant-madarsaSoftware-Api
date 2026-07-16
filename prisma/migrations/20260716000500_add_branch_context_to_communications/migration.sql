ALTER TABLE `suggestions`
  ADD COLUMN IF NOT EXISTS `branch_id` INT NULL AFTER `tenant_id`;

ALTER TABLE `support_requests`
  ADD COLUMN IF NOT EXISTS `branch_id` INT NULL AFTER `tenant_id`;

CREATE INDEX `suggestions_branch_id_idx` ON `suggestions`(`branch_id`);
CREATE INDEX `support_requests_branch_id_idx` ON `support_requests`(`branch_id`);

ALTER TABLE `suggestions`
  ADD CONSTRAINT `suggestions_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `support_requests`
  ADD CONSTRAINT `support_requests_branch_id_fkey`
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
