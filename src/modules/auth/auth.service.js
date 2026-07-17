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
const DEFAULT_FEE_VOUCHER_NUMBER = 'FEE-0001';

const isMissingFeeVoucherColumnError = (error) => {
  const message = String(error?.message || '');
  return error?.code === 'P2010' || message.includes('feeVoucherNoSeq') || message.includes('Unknown column');
};

const getFeeVoucherNoSeq = async (tenantId, tx = prisma) => {
  try {
    const rows = await tx.$queryRaw`
      SELECT feeVoucherNoSeq
      FROM madrassa_profiles
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `;
    return rows?.[0]?.feeVoucherNoSeq || '';
  } catch (error) {
    if (isMissingFeeVoucherColumnError(error)) return '';
    throw error;
  }
};

const setFeeVoucherNoSeq = async (tenantId, value, tx = prisma) => {
  try {
    await tx.$executeRaw`
      UPDATE madrassa_profiles
      SET feeVoucherNoSeq = ${emptyToNull(value)}
      WHERE tenant_id = ${tenantId}
    `;
  } catch (error) {
    if (isMissingFeeVoucherColumnError(error)) return false;
    throw error;
  }
  return true;
};

const withFeeVoucherNoSeq = async (profile) => {
  if (!profile?.tenantId) return { ...profile, feeVoucherNoSeq: '' };
  const feeVoucherNoSeq = await getFeeVoucherNoSeq(profile.tenantId);
  return { ...profile, feeVoucherNoSeq: feeVoucherNoSeq || DEFAULT_FEE_VOUCHER_NUMBER };
};

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

const buildRoleResponse = (role) => {
  if (!role) return null;

  const branchId = role.branchId ?? role.branch_id ?? null;
  const tenantId = role.tenantId ?? role.tenant_id ?? null;
  const scope = tenantId === null || tenantId === undefined ? 'system' : branchId ? 'branch' : 'tenant';

  return {
    id: role.id || null,
    tenantId,
    branchId,
    roleScopeKey: role.roleScopeKey ?? role.role_scope_key ?? null,
    scope,
    name: role.roleName || role.role_name || null,
    roleName: role.roleName || role.role_name || null,
    description: role.description || null,
    status: role.status || 'active',
    isSystemRole: Boolean(role.isSystemRole ?? role.is_system_role),
  };
};

const buildAccountScope = (admin, roleDetails) => {
  const tenantId = normalizeTenantId(admin.tenantId ?? admin.tenant_id);
  const branchId = normalizeTenantId(admin.branchId ?? admin.branch_id);
  const roleName = roleDetails?.roleName || admin.role;

  if (roleName === 'super_admin' && !tenantId) return 'super_admin';
  if (branchId) return 'branch_admin';
  if (roleName === 'admin' && tenantId) return 'tenant_admin';
  return tenantId ? 'tenant_user' : 'system_user';
};

const assertLoginRoleIsActive = (access, admin) => {
  if (!access.role?.id) {
    throw new AppError('Assigned role is not valid. Please contact support.', 403);
  }

  if (access.role.status && access.role.status !== 'active') {
    throw new AppError('Assigned role is inactive. Please contact support.', 403);
  }

  const adminTenantId = normalizeTenantId(admin.tenantId ?? admin.tenant_id);
  const roleTenantId = normalizeTenantId(access.role.tenantId ?? access.role.tenant_id);
  const isGlobalSuperAdmin = (admin.role === 'super_admin' || access.role.roleName === 'super_admin') && adminTenantId === null;

  if (!isGlobalSuperAdmin && roleTenantId !== adminTenantId) {
    throw new AppError('Assigned role is not valid for this tenant. Please contact support.', 403);
  }

  const adminBranchId = normalizeTenantId(admin.branchId ?? admin.branch_id);
  const roleBranchId = normalizeTenantId(access.role.branchId ?? access.role.branch_id);

  if (adminBranchId && roleBranchId !== adminBranchId) {
    throw new AppError('Assigned role is not valid for this branch. Please contact support.', 403);
  }

  if (!adminBranchId && roleBranchId && !isGlobalSuperAdmin) {
    throw new AppError('Assigned role is not valid for this account scope. Please contact support.', 403);
  }
};

const assertLoginBranchIsActive = async (admin) => {
  const branchId = admin.branchId ?? admin.branch_id ?? null;
  const tenantId = normalizeTenantId(admin.tenantId ?? admin.tenant_id);

  if (!branchId) return null;

  const branch = await prisma.branch.findFirst({
    where: {
      id: Number(branchId),
      tenantId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      tenantId: true,
      tenant: {
        select: {
          branchEnabled: true,
          status: true,
        },
      },
    },
  });

  if (!branch?.tenant?.branchEnabled) {
    throw new AppError('اس مدرسہ کے لیے برانچ سسٹم فعال نہیں ہے۔ ایڈمن سے رابطہ کریں۔', 403);
  }

  if (!branch || branch.status !== 'active') {
    throw new AppError('آپ کی برانچ غیر فعال ہے یا دستیاب نہیں۔ ایڈمن سے رابطہ کریں۔', 403);
  }

  return branch;
};

const canManageMadrassaProfile = async (admin) => {
  if (admin.role === 'super_admin' || admin.role === 'admin') return true;

  const access = await getAdminRoleAndPermissions(admin);
  const roleName = access.role?.roleName || access.role?.role_name || admin.role;
  return roleName === 'super_admin' || roleName === 'admin';
};

const buildAdminAuthPayload = async (admin) => {
  const access = await getAdminRoleAndPermissions(admin);
  assertLoginRoleIsActive(access, admin);
  const branch = await assertLoginBranchIsActive(admin);
  const roleDetails = buildRoleResponse(access.role);
  const branchId = admin.branchId || admin.branch_id || null;
  const tenantId = admin.tenantId || admin.tenant_id || null;
  const accountScope = buildAccountScope(admin, roleDetails);

  return {
    id: admin.id,
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || null,
    username: admin.username,
    role: admin.role,
    tenantId,
    branchId,
    branchName: branch?.name || null,
    branch,
    ownerAdminId: admin.ownerAdminId || admin.owner_admin_id || null,
    roleId: roleDetails?.id || null,
    roleScope: roleDetails?.scope || null,
    roleDetails,
    permissions: access.permissionKeys,
    accountScope,
    userType: accountScope,
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
      SELECT
        a.id,
        a.name,
        a.email,
        a.phone,
        a.username,
        a.role,
        a.tenant_id,
        a.role_id,
        a.owner_admin_id,
        a.branch_id,
        a.status,
        a.createdAt,
        a.updatedAt,
        b.status AS branch_status,
        t.branch_enabled,
        t.status AS tenant_status
      FROM admins a
      LEFT JOIN branches b ON b.id = a.branch_id
      LEFT JOIN tenant t ON t.id = a.tenant_id
      WHERE a.id = ${adminId}
      LIMIT 1
    `;

    const admin = rows[0];
    if (!admin) return null;

    return {
      id: Number(admin.id),
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      username: admin.username,
      role: admin.role,
      tenantId: admin.tenant_id === null || admin.tenant_id === undefined ? null : Number(admin.tenant_id),
      tenant_id: admin.tenant_id === null || admin.tenant_id === undefined ? null : Number(admin.tenant_id),
      roleId: admin.role_id === null || admin.role_id === undefined ? null : Number(admin.role_id),
      branchId: admin.branch_id === null || admin.branch_id === undefined ? null : Number(admin.branch_id),
      branch_id: admin.branch_id === null || admin.branch_id === undefined ? null : Number(admin.branch_id),
      branchStatus: admin.branch_status || null,
      branchEnabled: admin.branch_enabled === null || admin.branch_enabled === undefined ? null : Boolean(admin.branch_enabled),
      tenantStatus: admin.tenant_status || null,
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
        throw new AppError('یہ مدرسہ/ادارہ غیر فعال ہے۔ سپورٹ سے رابطہ کریں۔', 403);
      }
    }

    if (admin.status !== 'active') {
      throw new AppError('آپ کا اکاؤنٹ غیر فعال ہے۔ سپورٹ سے رابطہ کریں۔', 403);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, admin.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email/username or password.', 401);
    }

    const adminPayload = await buildAdminAuthPayload(admin);
    const userPayload = {
      id: adminPayload.id,
      name: adminPayload.name,
      email: adminPayload.email,
      phone: adminPayload.phone,
      username: adminPayload.username,
      tenantId: adminPayload.tenantId,
      branchId: adminPayload.branchId,
      branch: adminPayload.branch,
      ownerAdminId: adminPayload.ownerAdminId,
      role: adminPayload.roleDetails,
      roleName: adminPayload.role,
      roleId: adminPayload.roleId,
      permissions: adminPayload.permissions,
      status: adminPayload.status,
      createdAt: adminPayload.createdAt,
      updatedAt: adminPayload.updatedAt,
    };
    const token = generateAdminToken(adminPayload);

    return {
      token,
      admin: adminPayload,
      user: userPayload,
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

    const profile = await prisma.madrassaProfile.upsert({
      where: { tenantId: resolvedTenantId },
      update: {},
      create: buildDefaultMadrassaProfileData(admin, resolvedTenantId),
      select: madrassaProfileSelect,
    });

    return withFeeVoucherNoSeq(profile);
  },

  async updateMadrassaProfile(admin, tenantId, payload, file) {
    const isAllowedToManage = await canManageMadrassaProfile(admin);

    if (!isAllowedToManage) {
      throw new AppError('Only Super Admin or Admin can edit madrassa profile.', 403);
    }

    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingProfile = await this.getMadrassaProfile(admin, resolvedTenantId);

    const profile = await prisma.madrassaProfile.update({
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
        logoUrl: file ? buildLogoUrl(file) : emptyToNull(payload.logoUrl) || existingProfile.logoUrl,
        status: payload.status || 'active',
      },
      select: madrassaProfileSelect,
    });

    await setFeeVoucherNoSeq(resolvedTenantId, payload.feeVoucherNoSeq);
    return withFeeVoucherNoSeq(profile);
  },
};
