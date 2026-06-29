import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { getAdminRoleAndPermissions, getRoleById } from '../roles/roleAccess.service.js';

const mapUserRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
  username: row.username,
  role: row.role,
  tenantId: row.tenant_id === null || row.tenant_id === undefined ? null : Number(row.tenant_id),
  roleId: row.role_id === null || row.role_id === undefined ? null : Number(row.role_id),
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
      a.username,
      a.role,
      a.tenant_id,
      a.role_id,
      a.owner_admin_id,
      a.status,
      a.createdAt,
      a.updatedAt,
      r.role_name
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    WHERE a.id = ${id}
    LIMIT 1
  `;

  return rows[0] || null;
};

const ensureRoleExists = async (roleId, client = prisma) => {
  const role = await getRoleById(roleId, client);

  if (!role) {
    throw new AppError('Selected role was not found.', 400);
  }

  return role;
};

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const canAccessUserRow = (requester, row) => {
  if (requester?.isSuperAdmin) return true;
  return normalizeTenantId(row?.tenant_id) === normalizeTenantId(requester?.tenantId);
};

const assertCanAccessUserRow = (requester, row) => {
  if (!canAccessUserRow(requester, row)) {
    throw new AppError('User not found.', 404);
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

export const usersService = {
  async createUser(payload, creatorAdmin = null) {
    return prisma.$transaction(async (tx) => {
      const role = await ensureRoleExists(payload.roleId, tx);
      const tenantId = normalizeTenantId(creatorAdmin?.tenantId || creatorAdmin?.tenant_id);
      await ensureUniqueUser({ ...payload, tenantId }, tx);

      const hashedPassword = await bcrypt.hash(payload.password, 12);
      const roleName = role.role_name || 'admin';
      const ownerAdminId = creatorAdmin?.owner_admin_id || creatorAdmin?.id || null;

      await tx.$executeRaw`
        INSERT INTO admins (name, email, username, password, role, tenant_id, role_id, owner_admin_id, status, updatedAt)
        VALUES (
          ${payload.name},
          ${payload.email},
          ${payload.username},
          ${hashedPassword},
          ${roleName},
          ${tenantId},
          ${payload.roleId},
          ${ownerAdminId},
          ${payload.status || 'active'},
          CURRENT_TIMESTAMP
        )
      `;

      const createdRows = await tx.$queryRaw`
        SELECT id
        FROM admins
        WHERE username = ${payload.username}
          AND tenant_id <=> ${tenantId}
        LIMIT 1
      `;

      const createdUser = await getUserRowById(tx, Number(createdRows[0].id));
      return buildUserDetails(tx, createdUser);
    });
  },

  async getUsers(query, requester = null) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;
    const roleId = query.roleId || null;
    const tenantId = requester?.isSuperAdmin ? null : normalizeTenantId(requester?.tenantId);

    const items = requester?.isSuperAdmin
      ? await prisma.$queryRaw`
        SELECT
          a.id,
          a.name,
          a.email,
          a.username,
          a.role,
          a.tenant_id,
          a.role_id,
          a.owner_admin_id,
          a.status,
          a.createdAt,
          a.updatedAt,
          r.role_name
        FROM admins a
        LEFT JOIN roles r ON r.id = a.role_id
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
          a.username,
          a.role,
          a.tenant_id,
          a.role_id,
          a.owner_admin_id,
          a.status,
          a.createdAt,
          a.updatedAt,
          r.role_name
        FROM admins a
        LEFT JOIN roles r ON r.id = a.role_id
        WHERE a.tenant_id <=> ${tenantId}
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

      const nextEmail = payload.email || existingUser.email;
      const nextUsername = payload.username || existingUser.username;
      const tenantId = normalizeTenantId(existingUser.tenant_id);

      if (payload.email || payload.username) {
        await ensureUniqueUser({ email: nextEmail, username: nextUsername, tenantId, excludeId: id }, tx);
      }

      let nextRoleId = existingUser.role_id;
      let nextRoleName = existingUser.role;

      if (payload.roleId) {
        const role = await ensureRoleExists(payload.roleId, tx);
        nextRoleId = payload.roleId;
        nextRoleName = role.role_name;
      }

      if (payload.password) {
        const hashedPassword = await bcrypt.hash(payload.password, 12);

        await tx.$executeRaw`
          UPDATE admins
          SET
            name = ${payload.name || existingUser.name},
            email = ${nextEmail},
            username = ${nextUsername},
            password = ${hashedPassword},
            role = ${nextRoleName},
            role_id = ${nextRoleId},
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
            username = ${nextUsername},
            role = ${nextRoleName},
            role_id = ${nextRoleId},
            status = ${payload.status || existingUser.status},
            updatedAt = CURRENT_TIMESTAMP
          WHERE id = ${id}
        `;
      }

      const updatedUser = await getUserRowById(tx, id);
      return buildUserDetails(tx, updatedUser);
    });
  },
};
