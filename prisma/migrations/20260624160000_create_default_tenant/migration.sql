INSERT IGNORE INTO `Tenant` (`tenantCode`, `name`, `status`, `createdAt`, `updatedAt`)
VALUES ('default', 'Default Madrassa', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE `admins` a
LEFT JOIN `roles` r ON r.`id` = a.`role_id`
SET a.`tenant_id` = (SELECT t.`id` FROM `Tenant` t WHERE t.`tenantCode` = 'default' LIMIT 1)
WHERE a.`tenant_id` IS NULL
  AND COALESCE(r.`role_name`, a.`role`) <> 'super_admin';
