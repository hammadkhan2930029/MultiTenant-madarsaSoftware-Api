const DEFAULT_TENANT_ROLES = [
  {
    roleName: 'admin',
    description: 'Tenant Admin role with all permissions.',
    permissionSet: 'all',
  },
  {
    roleName: 'teacher',
    description: 'Teacher role with student view and attendance permissions.',
    permissionSet: 'teacher',
  },
  {
    roleName: 'accountant',
    description: 'Accountant role with fees and reports permissions.',
    permissionSet: 'accountant',
  },
  {
    roleName: 'receptionist',
    description: 'Receptionist role with admissions permissions.',
    permissionSet: 'receptionist',
  },
  {
    roleName: 'read_only',
    description: 'Read Only role with view-only permissions.',
    permissionSet: 'readOnly',
  },
];

const mapRole = (row) => ({
  id: Number(row.id),
  roleName: row.role_name,
});

const ensureTenantRole = async (client, { tenantId, roleName, description, createdBy = null }) => {
  const existingRows = await client.$queryRaw`
    SELECT id, role_name
    FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name = ${roleName}
    LIMIT 1
  `;

  if (existingRows[0]) {
    await client.$executeRaw`
      UPDATE roles
      SET
        is_system_role = true,
        status = 'active',
        updated_by = ${createdBy}
      WHERE id = ${Number(existingRows[0].id)}
    `;

    return mapRole(existingRows[0]);
  }

  await client.$executeRaw`
    INSERT INTO roles (tenant_id, role_name, description, status, is_system_role, created_by, updated_by)
    VALUES (${tenantId}, ${roleName}, ${description}, 'active', true, ${createdBy}, ${createdBy})
  `;

  const createdRows = await client.$queryRaw`
    SELECT id, role_name
    FROM roles
    WHERE tenant_id = ${tenantId}
      AND role_name = ${roleName}
    LIMIT 1
  `;

  return createdRows[0] ? mapRole(createdRows[0]) : null;
};

const assignAllPermissions = async (client, { tenantId, roleId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${tenantId}, ${roleId}, p.id
    FROM permissions p
  `;
};

const assignTeacherPermissions = async (client, { tenantId, roleId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${tenantId}, ${roleId}, p.id
    FROM permissions p
    WHERE p.permission_key = 'students.view'
      OR p.permission_key LIKE 'attendance.%'
  `;
};

const assignAccountantPermissions = async (client, { tenantId, roleId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${tenantId}, ${roleId}, p.id
    FROM permissions p
    WHERE p.permission_key LIKE 'fees.%'
      OR p.permission_key LIKE 'reports.%'
  `;
};

const assignReceptionistPermissions = async (client, { tenantId, roleId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${tenantId}, ${roleId}, p.id
    FROM permissions p
    WHERE p.permission_key LIKE 'admissions.%'
  `;
};

const assignReadOnlyPermissions = async (client, { tenantId, roleId }) => {
  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${tenantId}, ${roleId}, p.id
    FROM permissions p
    WHERE p.action = 'view'
      OR p.permission_key LIKE '%.view'
  `;
};

const assignPermissions = async (client, { tenantId, roleId, permissionSet }) => {
  if (permissionSet === 'all') {
    await assignAllPermissions(client, { tenantId, roleId });
    return;
  }

  if (permissionSet === 'teacher') {
    await assignTeacherPermissions(client, { tenantId, roleId });
    return;
  }

  if (permissionSet === 'accountant') {
    await assignAccountantPermissions(client, { tenantId, roleId });
    return;
  }

  if (permissionSet === 'receptionist') {
    await assignReceptionistPermissions(client, { tenantId, roleId });
    return;
  }

  if (permissionSet === 'readOnly') {
    await assignReadOnlyPermissions(client, { tenantId, roleId });
  }
};

export const seedDefaultTenantRoles = async (client, tenantId, options = {}) => {
  const createdBy = options.createdBy || null;
  const roles = {};

  for (const roleConfig of DEFAULT_TENANT_ROLES) {
    const role = await ensureTenantRole(client, {
      tenantId,
      roleName: roleConfig.roleName,
      description: roleConfig.description,
      createdBy,
    });

    if (!role) continue;

    await assignPermissions(client, {
      tenantId,
      roleId: role.id,
      permissionSet: roleConfig.permissionSet,
    });

    roles[role.roleName] = role;
  }

  return roles;
};

export const defaultTenantRoles = DEFAULT_TENANT_ROLES;
