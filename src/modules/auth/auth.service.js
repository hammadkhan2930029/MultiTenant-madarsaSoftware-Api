import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { generateAdminToken } from '../../utils/jwt.js';

const adminProfileSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

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

export const authService = {
  async getAuthenticatedAdminById(adminId) {
    return prisma.admin.findUnique({
      where: { id: adminId },
      select: adminProfileSelect,
    });
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

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
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

    return admin;
  },

  async getMadrassaProfile(admin) {
    return prisma.madrassaProfile.upsert({
      where: { adminId: admin.id },
      update: {},
      create: buildDefaultMadrassaProfileData(admin),
      select: madrassaProfileSelect,
    });
  },

  async updateMadrassaProfile(admin, payload, file) {
    await this.getMadrassaProfile(admin);

    return prisma.madrassaProfile.update({
      where: { adminId: admin.id },
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
