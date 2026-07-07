import { permissionService } from '../rbac/permission.service.js';

const moduleKeyFromPermission = (permission) => String(permission.permissionKey || '').split('.')[0] || '';

const toDisplayLabel = (value = '') => String(value)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const mapPermissionForUi = (permission) => ({
  key: permission.permissionKey,
  action: permission.action || String(permission.permissionKey || '').split('.').slice(1).join('.'),
  label: permission.displayLabel || permission.permissionName,
  description: permission.description || '',
});

const mapFlatPermissionForUi = (permission) => ({
  module: moduleKeyFromPermission(permission),
  moduleLabel: permission.moduleName || toDisplayLabel(moduleKeyFromPermission(permission)),
  ...mapPermissionForUi(permission),
});

export const permissionsService = {
  async getPermissions() {
    const permissions = await permissionService.getAll();
    return permissions.map(mapFlatPermissionForUi);
  },

  async getGroupedPermissions() {
    const permissions = await permissionService.getAll();
    const groups = new Map();

    for (const permission of permissions) {
      const module = moduleKeyFromPermission(permission);
      const moduleLabel = permission.moduleName || toDisplayLabel(module);

      if (!groups.has(module)) {
        groups.set(module, {
          module,
          moduleLabel,
          permissions: [],
        });
      }

      groups.get(module).permissions.push(mapPermissionForUi(permission));
    }

    return Array.from(groups.values());
  },
};
