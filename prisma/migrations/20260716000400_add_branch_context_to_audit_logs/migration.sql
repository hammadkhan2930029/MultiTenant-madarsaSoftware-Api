ALTER TABLE `audit_logs`
  ADD COLUMN `branch_id` INTEGER NULL AFTER `actor_user_id`,
  ADD COLUMN `role_id` INTEGER NULL AFTER `branch_id`;

CREATE INDEX `audit_logs_branch_id_idx` ON `audit_logs`(`branch_id`);
CREATE INDEX `audit_logs_role_id_idx` ON `audit_logs`(`role_id`);
CREATE INDEX `audit_logs_tenant_id_branch_id_idx` ON `audit_logs`(`tenant_id`, `branch_id`);

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `audit_logs_role_id_fkey`
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT IGNORE INTO `permissions` (`permission_key`, `permission_name`, `display_label`, `page_path`, `module_name`, `action`, `sort_order`)
VALUES
  ('audit.view', 'View Audit Logs', 'آڈٹ لاگز دیکھیں', '/audit-logs', 'audit', 'view', 10);
