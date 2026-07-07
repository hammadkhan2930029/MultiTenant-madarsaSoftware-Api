UPDATE `admins` a
JOIN `roles` r
  ON r.`tenant_id` <=> a.`tenant_id`
 AND r.`role_name` = a.`role`
SET a.`role_id` = r.`id`
WHERE a.`role_id` IS NULL;

UPDATE `admins` a
JOIN `roles` r
  ON r.`tenant_id` <=> a.`tenant_id`
 AND r.`role_name` = 'admin'
SET a.`role_id` = r.`id`,
    a.`role` = r.`role_name`
WHERE a.`tenant_id` IS NOT NULL
  AND a.`role_id` IS NULL;

UPDATE `admins` a
JOIN `roles` r
  ON r.`tenant_id` IS NULL
 AND r.`role_name` = 'super_admin'
SET a.`role_id` = r.`id`,
    a.`role` = r.`role_name`
WHERE a.`tenant_id` IS NULL
  AND a.`role_id` IS NULL;

UPDATE `admins` a
JOIN `roles` r
  ON r.`id` = a.`role_id`
SET a.`role` = r.`role_name`
WHERE a.`role_id` IS NOT NULL
  AND a.`role` <> r.`role_name`;

UPDATE `admins` a
JOIN `roles` current_role_row
  ON current_role_row.`id` = a.`role_id`
JOIN `roles` tenant_role
  ON tenant_role.`tenant_id` = a.`tenant_id`
 AND tenant_role.`role_name` = current_role_row.`role_name`
SET a.`role_id` = tenant_role.`id`,
    a.`role` = tenant_role.`role_name`
WHERE a.`tenant_id` IS NOT NULL
  AND current_role_row.`tenant_id` IS NULL;
