import { prisma } from '../src/config/prisma.js';

const MIGRATION_TAG = '20260717_branch_role_scope_data_migration';

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const hasColumn = async (tableName, columnName) => {
  const rows = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
    LIMIT 1
  `;
  return rows.length > 0;
};

const hasIndex = async (tableName, indexName) => {
  const rows = await prisma.$queryRaw`
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND INDEX_NAME = ${indexName}
    LIMIT 1
  `;
  return rows.length > 0;
};

const hasForeignKey = async (constraintName) => {
  const rows = await prisma.$queryRaw`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'roles'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND CONSTRAINT_NAME = ${constraintName}
    LIMIT 1
  `;
  return rows.length > 0;
};

const hasAuditBranchContextColumns = async (client) => {
  const rows = await client.$queryRaw`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'audit_logs'
      AND COLUMN_NAME IN ('branch_id', 'role_id')
  `;
  const columns = new Set(rows.map((row) => row.COLUMN_NAME || row.columnName));
  return columns.has('branch_id') && columns.has('role_id');
};

const ensureRoleScopeSchema = async () => {
  const changes = [];

  if (!await hasColumn('roles', 'branch_id')) {
    await prisma.$executeRawUnsafe('ALTER TABLE `roles` ADD COLUMN `branch_id` INTEGER NULL AFTER `tenant_id`');
    changes.push('roles.branch_id added');
  }

  if (!await hasColumn('roles', 'role_scope_key')) {
    await prisma.$executeRawUnsafe('ALTER TABLE `roles` ADD COLUMN `role_scope_key` INTEGER NOT NULL DEFAULT 0 AFTER `branch_id`');
    changes.push('roles.role_scope_key added');
  }

  await prisma.$executeRawUnsafe('UPDATE `roles` SET `role_scope_key` = COALESCE(`branch_id`, 0) WHERE `role_scope_key` IS NULL OR `role_scope_key` = 0');

  if (await hasIndex('roles', 'roles_tenant_id_role_name_key')) {
    await prisma.$executeRawUnsafe('DROP INDEX `roles_tenant_id_role_name_key` ON `roles`');
    changes.push('roles_tenant_id_role_name_key dropped');
  }

  if (!await hasIndex('roles', 'roles_branch_id_idx')) {
    await prisma.$executeRawUnsafe('CREATE INDEX `roles_branch_id_idx` ON `roles`(`branch_id`)');
    changes.push('roles_branch_id_idx added');
  }

  if (!await hasIndex('roles', 'roles_tenant_id_branch_id_idx')) {
    await prisma.$executeRawUnsafe('CREATE INDEX `roles_tenant_id_branch_id_idx` ON `roles`(`tenant_id`, `branch_id`)');
    changes.push('roles_tenant_id_branch_id_idx added');
  }

  if (!await hasIndex('roles', 'roles_tenant_scope_role_name_key')) {
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX `roles_tenant_scope_role_name_key` ON `roles`(`tenant_id`, `role_scope_key`, `role_name`)');
    changes.push('roles_tenant_scope_role_name_key added');
  }

  if (!await hasForeignKey('roles_branch_id_fkey')) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`roles\`
        ADD CONSTRAINT \`roles_branch_id_fkey\`
        FOREIGN KEY (\`branch_id\`) REFERENCES \`branches\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
    changes.push('roles_branch_id_fkey added');
  }

  return changes;
};

const fetchBranchUserTenantRoleGroups = async (client) => client.$queryRaw`
  SELECT
    r.id AS roleId,
    r.role_name AS roleName,
    r.tenant_id AS tenantId,
    r.created_by AS roleCreatedBy,
    r.description,
    r.status,
    r.is_system_role AS isSystemRole,
    a.branch_id AS branchId,
    b.name AS branchName,
    b.tenant_id AS branchTenantId,
    COUNT(DISTINCT a.id) AS userCount
  FROM admins a
  INNER JOIN roles r ON r.id = a.role_id
  INNER JOIN branches b ON b.id = a.branch_id
  WHERE a.branch_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND a.tenant_id = r.tenant_id
    AND b.tenant_id = a.tenant_id
    AND r.branch_id IS NULL
    AND COALESCE(r.role_scope_key, 0) = 0
  GROUP BY r.id, r.role_name, r.tenant_id, r.created_by, r.description, r.status, r.is_system_role, a.branch_id, b.name, b.tenant_id
  ORDER BY r.tenant_id, a.branch_id, r.id
`;

const validatePreconditions = async (client) => {
  const invalidRows = await client.$queryRaw`
    SELECT
      a.id AS userId,
      a.username,
      a.tenant_id AS userTenantId,
      a.branch_id AS userBranchId,
      a.role_id AS roleId,
      r.tenant_id AS roleTenantId,
      r.branch_id AS roleBranchId,
      b.tenant_id AS branchTenantId,
      CASE
        WHEN r.id IS NULL THEN 'missing role'
        WHEN b.id IS NULL THEN 'missing branch'
        WHEN NOT (a.tenant_id <=> r.tenant_id) THEN 'role tenant mismatch'
        WHEN b.tenant_id <> a.tenant_id THEN 'branch tenant mismatch'
        ELSE ''
      END AS issue
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN branches b ON b.id = a.branch_id
    WHERE a.branch_id IS NOT NULL
    HAVING issue <> ''
  `;

  if (invalidRows.length) {
    const error = new Error('Branch role migration precheck failed.');
    error.details = invalidRows;
    throw error;
  }
};

const getOrCreateBranchRole = async (client, group) => {
  const existingRows = await client.$queryRaw`
    SELECT id
    FROM roles
    WHERE tenant_id = ${toNumber(group.tenantId)}
      AND branch_id = ${toNumber(group.branchId)}
      AND role_scope_key = ${toNumber(group.branchId)}
      AND role_name = ${group.roleName}
    LIMIT 1
  `;

  if (existingRows[0]) {
    return {
      roleId: Number(existingRows[0].id),
      created: false,
    };
  }

  await client.$executeRaw`
    INSERT INTO roles (tenant_id, branch_id, role_scope_key, role_name, description, status, is_system_role, created_by, updated_by)
    VALUES (
      ${toNumber(group.tenantId)},
      ${toNumber(group.branchId)},
      ${toNumber(group.branchId)},
      ${group.roleName},
      ${group.description || null},
      ${group.status || 'active'},
      ${Boolean(group.isSystemRole)},
      ${toNumber(group.roleCreatedBy)},
      ${toNumber(group.roleCreatedBy)}
    )
  `;

  const createdRows = await client.$queryRaw`
    SELECT id
    FROM roles
    WHERE tenant_id = ${toNumber(group.tenantId)}
      AND branch_id = ${toNumber(group.branchId)}
      AND role_scope_key = ${toNumber(group.branchId)}
      AND role_name = ${group.roleName}
    LIMIT 1
  `;

  const newRoleId = Number(createdRows[0].id);

  await client.$executeRaw`
    INSERT IGNORE INTO role_permissions (tenant_id, role_id, permission_id)
    SELECT ${toNumber(group.tenantId)}, ${newRoleId}, permission_id
    FROM role_permissions
    WHERE role_id = ${toNumber(group.roleId)}
  `;

  return {
    roleId: newRoleId,
    created: true,
  };
};

const recordAudit = async (client, group, newRoleId, affectedUsers, created) => {
  const oldValue = JSON.stringify({ sourceRoleId: Number(group.roleId), affectedUsers });
  const newValue = JSON.stringify({ branchRoleId: newRoleId, branchId: Number(group.branchId), created, migration: MIGRATION_TAG });

  if (await hasAuditBranchContextColumns(client)) {
    await client.$executeRaw`
      INSERT INTO audit_logs (tenant_id, actor_user_id, branch_id, role_id, action, module, target_type, target_id, old_value, new_value)
      VALUES (
        ${toNumber(group.tenantId)},
        ${null},
        ${toNumber(group.branchId)},
        ${newRoleId},
        'role.branch_scope.migrated',
        'roles',
        'role',
        ${newRoleId},
        ${oldValue},
        ${newValue}
      )
    `;
    return;
  }

  await client.$executeRaw`
    INSERT INTO audit_logs (tenant_id, actor_user_id, action, module, target_type, target_id, old_value, new_value)
    VALUES (
      ${toNumber(group.tenantId)},
      ${null},
      'role.branch_scope.migrated',
      'roles',
      'role',
      ${newRoleId},
      ${oldValue},
      ${newValue}
    )
  `;
};

const migrateData = async () => prisma.$transaction(async (tx) => {
  await validatePreconditions(tx);
  const groups = await fetchBranchUserTenantRoleGroups(tx);
  const migrated = [];

  for (const group of groups) {
    const sourceRoleId = Number(group.roleId);
    const branchId = Number(group.branchId);
    const tenantId = Number(group.tenantId);
    const { roleId: branchRoleId, created } = await getOrCreateBranchRole(tx, group);

    const affectedUsers = await tx.$queryRaw`
      SELECT id, username
      FROM admins
      WHERE tenant_id = ${tenantId}
        AND branch_id = ${branchId}
        AND role_id = ${sourceRoleId}
      ORDER BY id
    `;

    await tx.$executeRaw`
      UPDATE admins
      SET role_id = ${branchRoleId},
          updatedAt = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND branch_id = ${branchId}
        AND role_id = ${sourceRoleId}
    `;

    await recordAudit(tx, group, branchRoleId, affectedUsers, created);

    migrated.push({
      tenantId,
      branchId,
      branchName: group.branchName,
      sourceRoleId,
      branchRoleId,
      roleName: group.roleName,
      branchRoleCreated: created,
      affectedUsers: affectedUsers.map((user) => ({
        id: Number(user.id),
        username: user.username,
      })),
      rollbackSql: `UPDATE admins SET role_id = ${sourceRoleId} WHERE role_id = ${branchRoleId} AND branch_id = ${branchId} AND tenant_id = ${tenantId};`,
    });
  }

  const remainingIssues = await tx.$queryRaw`
    SELECT
      a.id AS userId,
      a.username,
      a.tenant_id AS userTenantId,
      a.branch_id AS userBranchId,
      a.role_id AS roleId,
      r.role_name AS roleName,
      r.tenant_id AS roleTenantId,
      r.branch_id AS roleBranchId,
      r.role_scope_key AS roleScopeKey,
      CASE
        WHEN r.id IS NULL THEN 'missing role'
        WHEN NOT (a.tenant_id <=> r.tenant_id) THEN 'user tenant and role tenant mismatch'
        WHEN a.branch_id IS NOT NULL AND (r.branch_id IS NULL OR r.branch_id <> a.branch_id OR r.role_scope_key <> a.branch_id) THEN 'branch user role scope mismatch'
        WHEN a.branch_id IS NULL AND r.branch_id IS NOT NULL THEN 'tenant user assigned branch role'
        ELSE ''
      END AS issue
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    WHERE a.role_id IS NOT NULL
    HAVING issue <> ''
    ORDER BY a.tenant_id, a.branch_id, a.id
  `;

  return {
    migrated,
    remainingIssues,
  };
}, {
  maxWait: 10000,
  timeout: 60000,
});

try {
  const schemaChanges = await ensureRoleScopeSchema();
  const result = await migrateData();

  console.log(JSON.stringify({
    migration: MIGRATION_TAG,
    schemaChanges,
    migratedCount: result.migrated.length,
    migrated: result.migrated,
    remainingIssues: result.remainingIssues.map((row) => ({
      userId: Number(row.userId),
      username: row.username,
      userTenantId: toNumber(row.userTenantId),
      userBranchId: toNumber(row.userBranchId),
      roleId: toNumber(row.roleId),
      roleName: row.roleName,
      roleTenantId: toNumber(row.roleTenantId),
      roleBranchId: toNumber(row.roleBranchId),
      roleScopeKey: toNumber(row.roleScopeKey),
      issue: row.issue,
    })),
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    migration: MIGRATION_TAG,
    failed: true,
    message: error.message,
    details: error.details || null,
  }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
