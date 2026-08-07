-- Merge legacy/duplicate permission assignments into the canonical keys used by the application.
INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
SELECT rp.tenant_id, rp.role_id, target.id
FROM role_permissions rp
JOIN permissions source ON source.id = rp.permission_id
JOIN permissions target ON target.permission_key = CASE source.permission_key
  WHEN 'admissions.create' THEN 'students.create'
  WHEN 'admissions.edit' THEN 'students.edit'
  WHEN 'admissions.update' THEN 'students.edit'
  WHEN 'students.update' THEN 'students.edit'
  WHEN 'parents.update' THEN 'parents.edit'
  WHEN 'attendance.mark' THEN 'attendance.create'
END
WHERE source.permission_key IN (
  'admissions.create',
  'admissions.edit',
  'admissions.update',
  'students.update',
  'parents.update',
  'attendance.mark'
);

DELETE rp
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
WHERE p.permission_key LIKE 'admissions.%'
   OR p.permission_key IN ('students.update', 'parents.update', 'attendance.mark');

DELETE FROM permissions
WHERE permission_key LIKE 'admissions.%'
   OR permission_key IN ('students.update', 'parents.update', 'attendance.mark');
