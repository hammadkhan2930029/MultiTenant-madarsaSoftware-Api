import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { generateAdminToken } from '../../utils/jwt.js';
import { getAdminRoleAndPermissions } from '../roles/roleAccess.service.js';

const madrassaProfileSelect = {
  id: true,
  adminId: true,
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

const buildDefaultMadrassaProfileData = (admin) => ({
  adminId: admin.id,
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

const resolveMadrassaProfileOwner = async (admin) => {
  const ownerAdminId = Number(admin.ownerAdminId || admin.owner_admin_id || admin.id);

  const access = await getAdminRoleAndPermissions(admin);
  const roleName = access.role?.roleName || access.role?.role_name || admin.role;

  if (!admin.ownerAdminId && !admin.owner_admin_id && roleName !== 'super_admin') {
    const existingProfiles = await prisma.$queryRaw`
      SELECT mp.adminId
      FROM madrassa_profiles mp
      INNER JOIN admins a ON a.id = mp.adminId
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE r.role_name = 'super_admin' OR a.role = 'super_admin'
      ORDER BY mp.id ASC
      LIMIT 1
    `;

    if (existingProfiles[0]?.adminId) {
      return { ...admin, id: Number(existingProfiles[0].adminId) };
    }
  }

  if (!ownerAdminId || ownerAdminId === Number(admin.id)) {
    return { ...admin, id: Number(admin.id) };
  }

  const rows = await prisma.$queryRaw`
    SELECT id, name, email, username, role, role_id, owner_admin_id, status, createdAt, updatedAt
    FROM admins
    WHERE id = ${ownerAdminId}
    LIMIT 1
  `;

  return rows[0] ? {
    ...rows[0],
    id: Number(rows[0].id),
  } : { ...admin, id: Number(admin.id) };
};

const buildAdminAuthPayload = async (admin) => {
  const access = await getAdminRoleAndPermissions(admin);

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    ownerAdminId: admin.ownerAdminId || admin.owner_admin_id || null,
    roleId: access.role?.id || null,
    roleDetails: access.role,
    permissions: access.permissionKeys,
    status: admin.status,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
};

export const authService = {
  async getAuthenticatedAdminById(adminId) {
    const rows = await prisma.$queryRaw`
      SELECT id, name, email, username, role, role_id, owner_admin_id, status, createdAt, updatedAt
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
      roleId: admin.role_id === null || admin.role_id === undefined ? null : Number(admin.role_id),
      ownerAdminId: admin.owner_admin_id === null || admin.owner_admin_id === undefined ? null : Number(admin.owner_admin_id),
      owner_admin_id: admin.owner_admin_id === null || admin.owner_admin_id === undefined ? null : Number(admin.owner_admin_id),
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };
  },

  async loginAdmin(payload) {
    const admin = await prisma.admin.findFirst({
      where: {
        OR: [{ email: payload.identity }, { username: payload.identity }],
      },
    });

    if (!admin) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    if (admin.status !== 'active') {
      throw new AppError('Your account is inactive. Please contact support.', 403);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, admin.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    const token = generateAdminToken(admin);
    const adminPayload = await buildAdminAuthPayload(admin);

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

  async getMadrassaProfile(admin) {
    const profileOwner = await resolveMadrassaProfileOwner(admin);

    return prisma.madrassaProfile.upsert({
      where: { adminId: profileOwner.id },
      update: {},
      create: buildDefaultMadrassaProfileData(profileOwner),
      select: madrassaProfileSelect,
    });
  },

  async updateMadrassaProfile(admin, payload, file) {
    const isAllowedToManage = await canManageMadrassaProfile(admin);

    if (!isAllowedToManage) {
      throw new AppError('Only Super Admin or Admin can edit madrassa profile.', 403);
    }

    const profileOwner = await resolveMadrassaProfileOwner(admin);
    await this.getMadrassaProfile(admin);

    return prisma.madrassaProfile.update({
      where: { adminId: profileOwner.id },
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
