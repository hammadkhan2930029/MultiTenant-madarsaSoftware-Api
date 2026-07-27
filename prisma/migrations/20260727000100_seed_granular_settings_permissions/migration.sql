INSERT IGNORE INTO `permissions` (`permission_key`, `permission_name`, `display_label`, `page_path`, `module_name`, `action`, `sort_order`)
VALUES
  ('settings.shifts.create', 'Create Shifts', 'شفٹ محفوظ کریں', '/setting/shift', 'settings', 'create', 21),
  ('settings.shifts.update', 'Update Shifts', 'شفٹ تبدیل کریں', '/setting/shift', 'settings', 'update', 31),
  ('settings.shifts.delete', 'Delete Shifts', 'شفٹ حذف کریں', '/setting/shift', 'settings', 'delete', 41),
  ('settings.departments.create', 'Create Departments', 'شعبہ محفوظ کریں', '/setting/department', 'settings', 'create', 22),
  ('settings.departments.update', 'Update Departments', 'شعبہ تبدیل کریں', '/setting/department', 'settings', 'update', 32),
  ('settings.departments.delete', 'Delete Departments', 'شعبہ حذف کریں', '/setting/department', 'settings', 'delete', 42),
  ('settings.degrees.create', 'Create Degrees', 'ڈگری نام محفوظ کریں', '/setting/degree-name', 'settings', 'create', 23),
  ('settings.degrees.update', 'Update Degrees', 'ڈگری نام تبدیل کریں', '/setting/degree-name', 'settings', 'update', 33),
  ('settings.degrees.delete', 'Delete Degrees', 'ڈگری نام حذف کریں', '/setting/degree-name', 'settings', 'delete', 43);
