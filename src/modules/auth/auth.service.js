import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { generateAdminToken } from '../../utils/jwt.js';
import { getAdminRoleAndPermissions } from '../roles/roleAccess.service.js';

const madrassaProfileSelect = {
  id: true,
  adminId: true,
  tenantId: true,
  name: true,
  email: true,
  phone1: true,
  phone2: true,
  address: true,
  branch: true,
  city: true,
  familyNoSeq: true,
  regNo: true,
  logoUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const emptyToNull = (value) => (value ? value : null);
const buildLogoUrl = (file) => (file ? `/uploads/madrassa-profiles/${file.filename}` : null);

const buildDefaultMadrassaProfileData = (admin, tenantId) => ({
  adminId: admin.id,
  tenantId,
  name: 'Jamia Anwar ul Quran',
  email: admin.email,
  phone1: '0300-1234567',
  phone2: '0321-7654321',
  address: 'Township, Lahore',
  branch: 'Main Campus',
  city: 'Lahore',
  familyNoSeq: 'FAM-2026-001',
  regNo: 'REG-QA-9921',
  status: 'active',
});

const canManageMadrassaProfile = async (admin) => {
  if (admin.role === 'super_admin' || admin.role === 'admin') return true;

  const access = await getAdminRoleAndPermissions(admin);
  const roleName = access.role?.roleName || access.role?.role_name || admin.role;
  return roleName === 'super_admin' || roleName === 'admin';
};

const buildAdminAuthPayload = async (admin) => {
  const access = await getAdminRoleAndPermissions(admin);

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    tenantId: admin.tenantId || admin.tenant_id || null,
    ownerAdminId: admin.ownerAdminId || admin.owner_admin_id || null,
    roleId: access.role?.id || null,
    roleDetails: access.role,
    permissions: access.permissionKeys,
    status: admin.status,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const isSuperAdminAccount = (admin) => {
  const assignedRoleName = admin.assignedRole?.roleName || admin.assignedRole?.role_name;
  return admin.role === 'super_admin' || assignedRoleName === 'super_admin';
};

const findTenantAdminByIdentity = (identity, tenantId) =>
  prisma.admin.findFirst({
    where: {
      tenantId,
      OR: [{ email: identity }, { username: identity }],
    },
    include: {
      assignedRole: true,
    },
  });

const findGlobalSuperAdminByIdentity = (identity) =>
  prisma.admin.findFirst({
    where: {
      tenantId: null,
      AND: [
        {
          OR: [{ email: identity }, { username: identity }],
        },
        {
          OR: [
            { role: 'super_admin' },
            { assignedRole: { roleName: 'super_admin' } },
          ],
        },
      ],
    },
    include: {
      assignedRole: true,
    },
  });

export const authService = {
  async getAuthenticatedAdminById(adminId) {
    const rows = await prisma.$queryRaw`
      SELECT id, name, email, username, role, tenant_id, role_id, owner_admin_id, status, createdAt, updatedAt
      FROM admins
      WHERE id = ${adminId}
      LIMIT 1
    `;

    const admin = rows[0];
    if (!admin) return null;

    return {
      id: Number(admin.id),
      name: admin.name,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      tenantId: admin.tenant_id === null || admin.tenant_id === undefined ? null : Number(admin.tenant_id),
      tenant_id: admin.tenant_id === null || admin.tenant_id === undefined ? null : Number(admin.tenant_id),
      roleId: admin.role_id === null || admin.role_id === undefined ? null : Number(admin.role_id),
      ownerAdminId: admin.owner_admin_id === null || admin.owner_admin_id === undefined ? null : Number(admin.owner_admin_id),
      owner_admin_id: admin.owner_admin_id === null || admin.owner_admin_id === undefined ? null : Number(admin.owner_admin_id),
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  },

  async loginAdmin(payload, context = {}) {
    const tenantId = normalizeTenantId(context.tenantId);
    const identity = String(payload.identity || '').trim();

    let admin = await findTenantAdminByIdentity(identity, tenantId);

    if (!admin && context.isSystemHost) {
      admin = await findGlobalSuperAdminByIdentity(identity);
    }

    if (!admin) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    const adminTenantId = normalizeTenantId(admin.tenantId);
    const isGlobalSuperAdmin = isSuperAdminAccount(admin) && adminTenantId === null;

    if (!isGlobalSuperAdmin && adminTenantId !== tenantId) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    if (isGlobalSuperAdmin && !context.isSystemHost) {
      throw new AppError('Super admin login is only available from the global admin panel.', 403);
    }

    if (!isGlobalSuperAdmin) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { status: true },
      });

      if (!tenant || tenant.status !== 'active') {
        throw new AppError('Tenant is inactive. Please contact support.', 403);
      }
    }

    if (admin.status !== 'active') {
      throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, admin.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    const adminPayload = await buildAdminAuthPayload(admin);
    const token = generateAdminToken(adminPayload);

    return {
      token,
      admin: adminPayload,
      user: adminPayload,
      role: adminPayload.roleDetails,
      permissions: adminPayload.permissions,
    };
  },

  async changePassword({ adminId, currentPassword, newPassword }) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new AppError('Admin account not found.', 404);
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);

    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect.', 400);
    }

    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      throw new AppError('New password must be different from current password.', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      adminId,
      passwordChanged: true,
    };
  },

  async getCurrentAdminProfile(adminId) {
    const admin = await this.getAuthenticatedAdminById(adminId);

    if (!admin) {
      throw new AppError('Admin account not found.', 404);
    }

    return buildAdminAuthPayload(admin);
  },

  async getMadrassaProfile(admin, tenantId) {
    const resolvedTenantId = normalizeTenantId(tenantId);

    if (!resolvedTenantId) {
      throw new AppError('Tenant context is required for madrassa profile.', 403);
    }

    return prisma.madrassaProfile.upsert({
      where: { tenantId: resolvedTenantId },
      update: {},
      create: buildDefaultMadrassaProfileData(admin, resolvedTenantId),
      select: madrassaProfileSelect,
    });
  },

  async updateMadrassaProfile(admin, tenantId, payload, file) {
    const isAllowedToManage = await canManageMadrassaProfile(admin);

    if (!isAllowedToManage) {
      throw new AppError('Only Super Admin or Admin can edit madrassa profile.', 403);
    }

    const resolvedTenantId = normalizeTenantId(tenantId);
    await this.getMadrassaProfile(admin, resolvedTenantId);

    return prisma.madrassaProfile.update({
      where: { tenantId: resolvedTenantId },
      data: {
        name: payload.name,
        email: payload.email,
        phone1: emptyToNull(payload.phone1),
        phone2: emptyToNull(payload.phone2),
        address: emptyToNull(payload.address),
        branch: emptyToNull(payload.branch),
        city: emptyToNull(payload.city),
        familyNoSeq: emptyToNull(payload.familyNoSeq),
        regNo: emptyToNull(payload.regNo),
        logoUrl: file ? buildLogoUrl(file) : emptyToNull(payload.logoUrl),
        status: payload.status || 'active',
      },
      select: madrassaProfileSelect,
    });
  },
};
