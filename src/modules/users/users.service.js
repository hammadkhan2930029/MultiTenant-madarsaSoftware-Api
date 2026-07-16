import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { getAdminRoleAndPermissions, getRoleById } from '../roles/roleAccess.service.js';
import { auditService } from '../security/index.js';

const mapUserRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  phone: row.phone,
  username: row.username,
  role: row.role,
  tenantId: row.tenant_id === null || row.tenant_id === undefined ? null : Number(row.tenant_id),
  roleId: row.role_id === null || row.role_id === undefined ? null : Number(row.role_id),
  branchId: row.branch_id === null || row.branch_id === undefined ? null : Number(row.branch_id),
  branch: row.branch_id
    ? {
        id: Number(row.branch_id),
        name: row.branch_name || null,
        code: row.branch_code || null,
        status: row.branch_status || null,
      }
    : null,
  ownerAdminId: row.owner_admin_id === null || row.owner_admin_id === undefined ? null : Number(row.owner_admin_id),
  roleName: row.role_name || row.role,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const getUserRowById = async (client, id) => {
  const rows = await client.$queryRaw`
    SELECT
      a.id,
      a.name,
      a.email,
      a.phone,
      a.username,
      a.role,
      a.tenant_id,
      a.role_id,
      a.branch_id,
      a.owner_admin_id,
      a.status,
      a.createdAt,
      a.updatedAt,
      r.role_name,
      b.name AS branch_name,
      b.code AS branch_code,
      b.status AS branch_status
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN branches b ON b.id = a.branch_id
    WHERE a.id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
};

const ensureRoleExists = async (roleId, requester = null, client = prisma) => {
  const role = await getRoleById(roleId, client);

  if (!role) {
    throw new AppError('Selected role was not found.', 400);
  }

  if (role.status && role.status !== 'active') {
    throw new AppError('Selected role is inactive.', 400);
  }

  if (!requester?.isSuperAdmin) {
    const roleTenantId = normalizeTenantId(role.tenant_id);
    const requesterTenantId = normalizeTenantId(requester?.tenantId);

    if (!roleTenantId || roleTenantId !== requesterTenantId) {
      throw new AppError('Selected role was not found.', 400);
    }
  }

  return role;
};

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const normalizeBranchId = (branchId) => (
  branchId === null || branchId === undefined || branchId === '' ? null : Number(branchId)
);

const ensureAssignableBranch = async (branchId, tenantId, client = prisma) => {
  const resolvedBranchId = normalizeBranchId(branchId);
  if (!resolvedBranchId) return null;

  const resolvedTenantId = normalizeTenantId(tenantId);
  const branch = await client.branch.findFirst({
    where: {
      id: resolvedBranchId,
      tenantId: resolvedTenantId,
    },
    select: {
      id: true,
      tenantId: true,
      status: true,
    },
  });

  if (!branch) {
    throw new AppError('منتخب برانچ دستیاب نہیں یا آپ کو اس تک رسائی نہیں ہے۔', 403);
  }

  if (branch.status !== 'active') {
    throw new AppError('منتخب برانچ غیر فعال ہے۔ فعال برانچ منتخب کریں۔', 403);
  }

  return branch.id;
};

const canAccessUserRow = (requester, row) => {
  if (requester?.isSuperAdmin) return true;
  const sameTenant = normalizeTenantId(row?.tenant_id) === normalizeTenantId(requester?.tenantId);
  if (!sameTenant) return false;

  const requesterBranchId = normalizeBranchId(requester?.branchId);
  if (!requesterBranchId) return true;

  return normalizeBranchId(row?.branch_id) === requesterBranchId;
};

const assertCanAccessUserRow = (requester, row) => {
  if (!canAccessUserRow(requester, row)) {
    throw new AppError('User not found.', 404);
  }
};

const assertRoleCanBeAssignedToTenant = (role, tenantId) => {
  const roleTenantId = normalizeTenantId(role?.tenant_id);
  const targetTenantId = normalizeTenantId(tenantId);

  if (roleTenantId !== targetTenantId) {
    throw new AppError('Selected role was not found for this tenant.', 400);
  }
};

const normalizeUsername = (payload) => {
  const explicitUsername = String(payload.username || '').trim();
  if (explicitUsername) return explicitUsername;

  const emailPrefix = String(payload.email || '').split('@')[0] || 'user';
  return emailPrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 100);
};

const assertNotSelfDeactivate = (id, payload, requester = null) => {
  const requesterId = requester?.admin?.id === null || requester?.admin?.id === undefined
    ? null
    : Number(requester.admin.id);

  if (!requesterId || Number(id) !== requesterId) return;

  if (payload.status === 'inactive') {
    throw new AppError('You cannot deactivate your own account.', 400);
  }
};

const assertNotSelfRoleChange = (id, requester = null) => {
  const requesterId = requester?.admin?.id === null || requester?.admin?.id === undefined
    ? null
    : Number(requester.admin.id);

  if (requesterId && Number(id) === requesterId) {
    throw new AppError('You cannot change your own role.', 400);
  }
};

const ensureUniqueUser = async ({ email, username, tenantId = null, excludeId = null }, client = prisma) => {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const rows = excludeId
    ? await client.$queryRaw`
        SELECT id, email, username
        FROM admins
        WHERE id <> ${excludeId}
          AND tenant_id <=> ${normalizedTenantId}
          AND (email = ${email} OR username = ${username})
        LIMIT 1
      `
    : await client.$queryRaw`
        SELECT id, email, username
        FROM admins
        WHERE tenant_id <=> ${normalizedTenantId}
          AND (email = ${email} OR username = ${username})
        LIMIT 1
      `;

  const duplicateUser = rows[0];
  if (!duplicateUser) return;

  if (duplicateUser.email === email) {
    throw new AppError('User with the same email already exists.', 409);
  }

  throw new AppError('User with the same username already exists.', 409);
};

const buildUserDetails = async (client, row) => {
  const user = mapUserRow(row);
  const access = await getAdminRoleAndPermissions(user, client);

  return {
    ...user,
    roleDetails: access.role,
    role: access.role || {
      id: user.roleId,
      roleName: user.roleName,
    },
    permissions: access.permissions,
    permissionKeys: access.permissionKeys,
  };
};

const logUserAudit = (client, requester = {}, entry = {}) => auditService.recordAuditLog(client, {
  tenantId: entry.tenantId,
  actorUserId: requester?.admin?.id || null,
  branchId: entry.branchId ?? entry.newValue?.branchId ?? entry.oldValue?.branchId ?? requester?.audit?.branchId ?? null,
  roleId: requester?.audit?.roleId || requester?.admin?.roleId || requester?.admin?.role_id || null,
  module: 'users',
  targetType: 'user',
  ipAddress: requester?.audit?.ipAddress || null,
  userAgent: requester?.audit?.userAgent || null,
  ...entry,
});

export const usersService = {
  async createUser(payload, requester = null) {
    return prisma.$transaction(async (tx) => {
      const role = await ensureRoleExists(payload.roleId, requester, tx);
      const tenantId = requester?.isSuperAdmin
        ? normalizeTenantId(role.tenant_id)
        : normalizeTenantId(requester?.tenantId);
      assertRoleCanBeAssignedToTenant(role, tenantId);

      const hashedPassword = await bcrypt.hash(payload.password, 12);
      const username = normalizeUsername(payload);
      const roleName = role.role_name || 'admin';
      const ownerAdminId = requester?.admin?.owner_admin_id || requester?.admin?.id || null;
      const branchId = await ensureAssignableBranch(payload.branchId, tenantId, tx);
      await ensureUniqueUser({ email: payload.email, username, tenantId }, tx);

      await tx.$executeRaw`
        INSERT INTO admins (name, email, phone, username, password, role, tenant_id, role_id, owner_admin_id, branch_id, status, updatedAt)
        VALUES (
          ${payload.name},
          ${payload.email},
          ${payload.phone || null},
          ${username},
          ${hashedPassword},
          ${roleName},
          ${tenantId},
          ${payload.roleId},
          ${ownerAdminId},
          ${branchId},
          ${payload.status || 'active'},
          CURRENT_TIMESTAMP
        )
      `;

      const createdRows = await tx.$queryRaw`
        SELECT id
        FROM admins
        WHERE username = ${username}
          AND tenant_id <=> ${tenantId}
        LIMIT 1
      `;

      const createdUser = await getUserRowById(tx, Number(createdRows[0].id));
      const createdResponse = await buildUserDetails(tx, createdUser);
      await logUserAudit(tx, requester, {
        tenantId: createdResponse.tenantId,
        action: 'user.created',
        targetId: createdResponse.id,
        oldValue: null,
        newValue: createdResponse,
      });

      return createdResponse;
    });
  },

  async getUsers(query, requester = null) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;
    const roleId = query.roleId || null;
    const tenantId = requester?.isSuperAdmin ? null : normalizeTenantId(requester?.tenantId);
    const branchId = requester?.isSuperAdmin ? null : normalizeBranchId(requester?.branchId);

    const items = requester?.isSuperAdmin
      ? await prisma.$queryRaw`
        SELECT
          a.id,
          a.name,
          a.email,
          a.phone,
          a.username,
          a.role,
          a.tenant_id,
          a.role_id,
          a.branch_id,
          a.owner_admin_id,
          a.status,
          a.createdAt,
          a.updatedAt,
          r.role_name,
          b.name AS branch_name,
          b.code AS branch_code,
          b.status AS branch_status
        FROM admins a
        LEFT JOIN roles r ON r.id = a.role_id
        LEFT JOIN branches b ON b.id = a.branch_id
        WHERE (${search} IS NULL
            OR a.name LIKE CONCAT('%', ${search}, '%')
            OR a.email LIKE CONCAT('%', ${search}, '%')
            OR a.username LIKE CONCAT('%', ${search}, '%'))
          AND (${status} IS NULL OR a.status = ${status})
          AND (${roleId} IS NULL OR a.role_id = ${roleId})
        ORDER BY a.createdAt DESC
        LIMIT ${limit} OFFSET ${skip}
      `
      : await prisma.$queryRaw`
        SELECT
          a.id,
          a.name,
          a.email,
          a.phone,
          a.username,
          a.role,
          a.tenant_id,
          a.role_id,
          a.branch_id,
          a.owner_admin_id,
          a.status,
          a.createdAt,
          a.updatedAt,
          r.role_name,
          b.name AS branch_name,
          b.code AS branch_code,
          b.status AS branch_status
        FROM admins a
        LEFT JOIN roles r ON r.id = a.role_id
        LEFT JOIN branches b ON b.id = a.branch_id
        WHERE a.tenant_id <=> ${tenantId}
          AND (${branchId} IS NULL OR a.branch_id = ${branchId})
          AND (${search} IS NULL
            OR a.name LIKE CONCAT('%', ${search}, '%')
            OR a.email LIKE CONCAT('%', ${search}, '%')
            OR a.username LIKE CONCAT('%', ${search}, '%'))
          AND (${status} IS NULL OR a.status = ${status})
          AND (${roleId} IS NULL OR a.role_id = ${roleId})
        ORDER BY a.createdAt DESC
        LIMIT ${limit} OFFSET ${skip}
      `;

    const totalRows = requester?.isSuperAdmin
      ? await prisma.$queryRaw`
        SELECT COUNT(*) AS total
        FROM admins a
        WHERE (${search} IS NULL
            OR a.name LIKE CONCAT('%', ${search}, '%')
            OR a.email LIKE CONCAT('%', ${search}, '%')
            OR a.username LIKE CONCAT('%', ${search}, '%'))
          AND (${status} IS NULL OR a.status = ${status})
          AND (${roleId} IS NULL OR a.role_id = ${roleId})
      `
      : await prisma.$queryRaw`
        SELECT COUNT(*) AS total
        FROM admins a
        WHERE a.tenant_id <=> ${tenantId}
          AND (${branchId} IS NULL OR a.branch_id = ${branchId})
          AND (${search} IS NULL
            OR a.name LIKE CONCAT('%', ${search}, '%')
            OR a.email LIKE CONCAT('%', ${search}, '%')
            OR a.username LIKE CONCAT('%', ${search}, '%'))
          AND (${status} IS NULL OR a.status = ${status})
          AND (${roleId} IS NULL OR a.role_id = ${roleId})
      `;

    return {
      items: items.map(mapUserRow),
      meta: buildPaginationMeta({ totalItems: Number(totalRows[0]?.total || 0), page, limit }),
    };
  },

  async getUserById(id, requester = null) {
    const user = await getUserRowById(prisma, id);

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    assertCanAccessUserRow(requester, user);

    return buildUserDetails(prisma, user);
  },

  async updateUser(id, payload, requester = null) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await getUserRowById(tx, id);

      if (!existingUser) {
        throw new AppError('User not found.', 404);
      }

      assertCanAccessUserRow(requester, existingUser);
      const oldResponse = await buildUserDetails(tx, existingUser);

      const nextEmail = payload.email || existingUser.email;
      const nextPhone = Object.prototype.hasOwnProperty.call(payload, 'phone') ? payload.phone || null : existingUser.phone;
      const nextUsername = payload.username || existingUser.username;
      const tenantId = normalizeTenantId(existingUser.tenant_id);
      const nextBranchId = Object.prototype.hasOwnProperty.call(payload, 'branchId')
        ? await ensureAssignableBranch(payload.branchId, tenantId, tx)
        : normalizeBranchId(existingUser.branch_id);
      assertNotSelfDeactivate(id, payload, requester);

      if (payload.email || payload.username) {
        await ensureUniqueUser({ email: nextEmail, username: nextUsername, tenantId, excludeId: id }, tx);
      }

      let nextRoleId = existingUser.role_id;
      let nextRoleName = existingUser.role;

      if (payload.password) {
        const hashedPassword = await bcrypt.hash(payload.password, 12);

        await tx.$executeRaw`
          UPDATE admins
          SET
            name = ${payload.name || existingUser.name},
            email = ${nextEmail},
            phone = ${nextPhone},
            username = ${nextUsername},
            password = ${hashedPassword},
            role = ${nextRoleName},
            role_id = ${nextRoleId},
            branch_id = ${nextBranchId},
            status = ${payload.status || existingUser.status},
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE admins
          SET
            name = ${payload.name || existingUser.name},
            email = ${nextEmail},
            phone = ${nextPhone},
            username = ${nextUsername},
            role = ${nextRoleName},
            role_id = ${nextRoleId},
            branch_id = ${nextBranchId},
            status = ${payload.status || existingUser.status},
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
      }

      const updatedUser = await getUserRowById(tx, id);
      const updatedResponse = await buildUserDetails(tx, updatedUser);
      await logUserAudit(tx, requester, {
        tenantId: updatedResponse.tenantId,
        action: updatedResponse.status === 'inactive' && oldResponse.status !== 'inactive' ? 'user.deactivated' : 'user.updated',
        targetId: updatedResponse.id,
        oldValue: oldResponse,
        newValue: updatedResponse,
      });

      return updatedResponse;
    });
  },

  async deactivateUser(id, requester = null) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await getUserRowById(tx, id);

      if (!existingUser) {
        throw new AppError('User not found.', 404);
      }

      assertCanAccessUserRow(requester, existingUser);
      assertNotSelfDeactivate(id, { status: 'inactive' }, requester);
      const oldResponse = await buildUserDetails(tx, existingUser);

      await tx.$executeRaw`
        UPDATE admins
        SET status = 'inactive',
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      const updatedUser = await getUserRowById(tx, id);
      const updatedResponse = await buildUserDetails(tx, updatedUser);
      await logUserAudit(tx, requester, {
        tenantId: updatedResponse.tenantId,
        action: 'user.deactivated',
        targetId: updatedResponse.id,
        oldValue: oldResponse,
        newValue: updatedResponse,
      });

      return updatedResponse;
    });
  },

  async assignRole(id, payload, requester = null) {
    return prisma.$transaction(async (tx) => {
      const existingUser = await getUserRowById(tx, id);

      if (!existingUser) {
        throw new AppError('User not found.', 404);
      }

      assertCanAccessUserRow(requester, existingUser);
      assertNotSelfRoleChange(id, requester);
      const oldResponse = await buildUserDetails(tx, existingUser);

      const role = await ensureRoleExists(payload.roleId, requester, tx);
      assertRoleCanBeAssignedToTenant(role, existingUser.tenant_id);

      await tx.$executeRaw`
        UPDATE admins
        SET role = ${role.role_name},
            role_id = ${payload.roleId},
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;

      const updatedUser = await getUserRowById(tx, id);
      const updatedResponse = await buildUserDetails(tx, updatedUser);
      await logUserAudit(tx, requester, {
        tenantId: updatedResponse.tenantId,
        action: 'user.role.changed',
        targetId: updatedResponse.id,
        oldValue: {
          roleId: oldResponse.roleId,
          roleName: oldResponse.roleName,
          role: oldResponse.roleDetails,
        },
        newValue: {
          roleId: updatedResponse.roleId,
          roleName: updatedResponse.roleName,
          role: updatedResponse.roleDetails,
        },
      });

      return updatedResponse;
    });
  },
};
