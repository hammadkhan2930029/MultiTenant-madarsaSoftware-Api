import bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/index.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { normalizeDomainName } from '../../utils/domain.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { seedDefaultTenantRoles } from '../roles/tenantRoleSeeder.service.js';
import { auditService } from '../security/index.js';

const mapTenant = (tenant) => ({
  id: tenant.id,
  tenantCode: tenant.tenantCode,
  name: tenant.name,
  subdomain: tenant.subdomain,
  customDomain: tenant.customDomain,
  status: tenant.status,
  branchEnabled: Boolean(tenant.branchEnabled ?? tenant.branch_enabled),
  branchLimit: tenant.branchLimit ?? tenant.branch_limit ?? null,
  ownerAdminId: tenant.ownerAdminId,
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

const emptyToNull = (value) => (value ? value : null);
const normalizeOptionalDomain = (value) => emptyToNull(normalizeDomainName(value));

const mapTenantAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  phone: admin.phone || null,
  username: admin.username,
  role: admin.role,
  tenantId: admin.tenantId,
  roleId: admin.roleId,
  status: admin.status,
});

const mapMadrassaProfile = (profile) => ({
  id: profile.id,
  adminId: profile.adminId,
  tenantId: profile.tenantId,
  name: profile.name,
  email: profile.email,
  phone1: profile.phone1,
  phone2: profile.phone2,
  address: profile.address,
  branch: profile.branch,
  city: profile.city,
  familyNoSeq: profile.familyNoSeq,
  regNo: profile.regNo,
  logoUrl: profile.logoUrl,
  status: profile.status,
});

const assertTenantCodeAvailable = async (tenantCode) => {
  const existingTenant = await prisma.tenant.findUnique({
    where: { tenantCode },
  });

  if (existingTenant) {
    throw new AppError('Tenant code is already in use.', 409);
  }
};

const assertDomainAvailable = async ({ subdomain, customDomain, excludeId = null }) => {
  const conditions = [];

  if (subdomain) conditions.push({ subdomain });
  if (customDomain) conditions.push({ customDomain });
  if (!conditions.length) return;

  const existingTenant = await prisma.tenant.findFirst({
    where: {
      OR: conditions,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (!existingTenant) return;

  if (subdomain && existingTenant.subdomain === subdomain) {
    throw new AppError('Subdomain is already assigned to another tenant.', 409);
  }

  throw new AppError('Custom domain is already assigned to another tenant.', 409);
};

const assertCustomDomainAllowed = (customDomain) => {
  if (!customDomain) return;

  if (env.tenantSystemHosts.includes(customDomain)) {
    throw new AppError('Custom domain is reserved for system use.', 400);
  }

  for (const baseDomain of env.tenantBaseDomains) {
    if (customDomain === baseDomain || customDomain.endsWith(`.${baseDomain}`)) {
      throw new AppError('Custom domain cannot use the configured tenant base domain.', 400);
    }
  }
};

const assertOwnerExists = async (ownerAdminId) => {
  if (!ownerAdminId) return;

  const owner = await prisma.admin.findUnique({
    where: { id: ownerAdminId },
    select: { id: true },
  });

  if (!owner) {
    throw new AppError('Owner admin was not found.', 400);
  }
};

const buildTenantLink = (tenant) => {
  if (tenant.customDomain) return `https://${tenant.customDomain}`;
  if (tenant.subdomain && env.tenantBaseDomains[0]) {
    return `https://${tenant.subdomain}.${env.tenantBaseDomains[0]}`;
  }
  return null;
};

const mapTenantAdminRow = (admin) => {
  if (!admin) return null;

  return {
    id: Number(admin.id),
    name: admin.name,
    email: admin.email,
    phone: admin.phone || null,
    username: admin.username,
    role: admin.role,
    tenantId: admin.tenant_id === null || admin.tenant_id === undefined ? null : Number(admin.tenant_id),
    roleId: admin.role_id === null || admin.role_id === undefined ? null : Number(admin.role_id),
    status: admin.status,
  };
};

const getTenantAdminDetails = async (tenantId, ownerAdminId = null, client = prisma) => {
  const rows = ownerAdminId
    ? await client.$queryRaw`
        SELECT id, name, email, phone, username, role, tenant_id, role_id, status
        FROM admins
        WHERE id = ${ownerAdminId}
          AND tenant_id = ${tenantId}
        LIMIT 1
      `
    : [];

  if (rows[0]) return mapTenantAdminRow(rows[0]);

  const fallbackRows = await client.$queryRaw`
    SELECT a.id, a.name, a.email, a.phone, a.username, a.role, a.tenant_id, a.role_id, a.status
    FROM admins a
    LEFT JOIN roles r ON r.id = a.role_id
    WHERE a.tenant_id = ${tenantId}
      AND (a.role = 'admin' OR r.role_name = 'admin')
    ORDER BY a.createdAt ASC
    LIMIT 1
  `;

  return mapTenantAdminRow(fallbackRows[0]);
};

const getBranchStats = async (tenantId, client = prisma) => {
  const [branchesCreated, activeBranches, inactiveBranches] = await Promise.all([
    client.branch.count({ where: { tenantId } }),
    client.branch.count({ where: { tenantId, status: 'active' } }),
    client.branch.count({ where: { tenantId, status: 'inactive' } }),
  ]);

  return { branchesCreated, activeBranches, inactiveBranches };
};

const getBranchStatsMap = async (tenantIds, client = prisma) => {
  if (!tenantIds.length) return new Map();

  const grouped = await client.branch.groupBy({
    by: ['tenantId', 'status'],
    where: { tenantId: { in: tenantIds } },
    _count: { _all: true },
  });

  const statsMap = new Map(tenantIds.map((tenantId) => [tenantId, { branchesCreated: 0, activeBranches: 0, inactiveBranches: 0 }]));

  for (const row of grouped) {
    const stats = statsMap.get(row.tenantId) || { branchesCreated: 0, activeBranches: 0, inactiveBranches: 0 };
    const count = row._count?._all || 0;
    stats.branchesCreated += count;
    if (row.status === 'active') stats.activeBranches += count;
    if (row.status === 'inactive') stats.inactiveBranches += count;
    statsMap.set(row.tenantId, stats);
  }

  return statsMap;
};

const getTenantAdminDetailsMap = async (tenants, client = prisma) => {
  const tenantIds = tenants.map((tenant) => tenant.id);
  if (!tenantIds.length) return new Map();

  const ownerAdminIds = tenants.map((tenant) => tenant.ownerAdminId).filter(Boolean);
  const ownerRows = ownerAdminIds.length
    ? await client.$queryRaw`
        SELECT id, name, email, phone, username, role, tenant_id, role_id, status
        FROM admins
        WHERE id IN (${Prisma.join(ownerAdminIds)})
          AND tenant_id IN (${Prisma.join(tenantIds)})
      `
    : [];
  const ownerMap = new Map(ownerRows.map((row) => [Number(row.tenant_id), mapTenantAdminRow(row)]));

  const fallbackRows = await client.$queryRaw`
    SELECT id, name, email, phone, username, role, tenant_id, role_id, status
    FROM (
      SELECT a.id, a.name, a.email, a.phone, a.username, a.role, a.tenant_id, a.role_id, a.status,
             ROW_NUMBER() OVER (PARTITION BY a.tenant_id ORDER BY a.createdAt ASC) AS row_num
      FROM admins a
      LEFT JOIN roles r ON r.id = a.role_id
      WHERE a.tenant_id IN (${Prisma.join(tenantIds)})
        AND (a.role = 'admin' OR r.role_name = 'admin')
    ) ranked_admins
    WHERE row_num = 1
  `;
  const fallbackMap = new Map(fallbackRows.map((row) => [Number(row.tenant_id), mapTenantAdminRow(row)]));

  return new Map(tenantIds.map((tenantId) => [tenantId, ownerMap.get(tenantId) || fallbackMap.get(tenantId) || null]));
};

const getRemainingBranches = ({ branchEnabled, branchLimit, branchesCreated }) => {
  if (!branchEnabled) return 0;
  if (!Number.isInteger(branchLimit)) return 0;
  return Math.max(branchLimit - branchesCreated, 0);
};

const mapTenantBranchSummary = ({ tenant, tenantAdmin, stats }) => {
  const branchEnabled = Boolean(tenant.branchEnabled ?? tenant.branch_enabled);
  const branchLimit = tenant.branchLimit ?? tenant.branch_limit ?? null;
  const branchesCreated = stats.branchesCreated || 0;

  return {
    id: tenant.id,
    tenantId: tenant.id,
    name: tenant.name,
    tenantName: tenant.name,
    tenantCode: tenant.tenantCode,
    subdomain: tenant.subdomain,
    customDomain: tenant.customDomain,
    link: buildTenantLink(tenant),
    tenantAdmin,
    status: tenant.status,
    branchEnabled,
    branchLimit,
    branchesCreated,
    remainingBranches: getRemainingBranches({ branchEnabled, branchLimit, branchesCreated }),
    activeBranches: stats.activeBranches || 0,
    inactiveBranches: stats.inactiveBranches || 0,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
};

const validateBranchSettingsAgainstCount = ({ branchEnabled, branchLimit, branchesCreated, enforceLimitFloor = true }) => {
  if (branchEnabled && (!Number.isInteger(branchLimit) || branchLimit < 1)) {
    throw new AppError('برانچ سسٹم فعال ہو تو برانچ حد کم از کم 1 ہونی چاہیے۔', 400);
  }

  if (branchLimit !== null && branchLimit !== undefined && branchLimit < 0) {
    throw new AppError('برانچ حد منفی نہیں ہو سکتی۔', 400);
  }

  if (enforceLimitFloor && Number.isInteger(branchLimit) && branchLimit < branchesCreated) {
    throw new AppError('برانچ حد موجودہ برانچز کی تعداد سے کم نہیں ہو سکتی۔ موجودہ برانچ ڈیٹا حذف نہیں کیا جائے گا۔', 400);
  }
};

const getTenantOrThrow = async (id, client = prisma) => {
  const tenant = await client.tenant.findUnique({
    where: { id: Number(id) },
  });

  if (!tenant) {
    throw new AppError('Tenant not found.', 404);
  }

  return tenant;
};

export const tenantsService = {
  async getTenantsWithBranchSettings(query = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { tenantCode: { contains: search } },
              { subdomain: { contains: search } },
              { customDomain: { contains: search } },
            ],
          }
        : {}),
    };

    const [tenants, totalItems] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    const tenantIds = tenants.map((tenant) => tenant.id);
    const [tenantAdminMap, branchStatsMap] = await Promise.all([
      getTenantAdminDetailsMap(tenants),
      getBranchStatsMap(tenantIds),
    ]);

    const items = tenants.map((tenant) =>
      mapTenantBranchSummary({
        tenant,
        tenantAdmin: tenantAdminMap.get(tenant.id) || null,
        stats: branchStatsMap.get(tenant.id) || { branchesCreated: 0, activeBranches: 0, inactiveBranches: 0 },
      })
    );

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getTenantBranchSummary(id) {
    const tenant = await getTenantOrThrow(id);
    const [tenantAdmin, stats] = await Promise.all([
      getTenantAdminDetails(tenant.id, tenant.ownerAdminId),
      getBranchStats(tenant.id),
    ]);

    return mapTenantBranchSummary({ tenant, tenantAdmin, stats });
  },

  async getTenantBranchList(id, query = {}) {
    const tenant = await getTenantOrThrow(id);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;
    const where = {
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { address: { contains: search } },
              { contact: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.branch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          name: true,
          code: true,
          address: true,
          contact: true,
          createdBy: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
          _count: {
            select: {
              classes: true,
              assignments: true,
              studentAttendances: true,
              teacherAttendances: true,
            },
          },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      tenant: mapTenant(tenant),
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async updateTenantBranchSettings(id, payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const tenant = await getTenantOrThrow(id, tx);
      const stats = await getBranchStats(tenant.id, tx);
      const branchEnabled = Boolean(payload.branchEnabled);
      const branchLimit = Object.prototype.hasOwnProperty.call(payload, 'branchLimit')
        ? payload.branchLimit
        : tenant.branchLimit;

      validateBranchSettingsAgainstCount({
        branchEnabled,
        branchLimit,
        branchesCreated: stats.branchesCreated,
        enforceLimitFloor: branchEnabled || Object.prototype.hasOwnProperty.call(payload, 'branchLimit'),
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          branchEnabled,
          branchLimit: branchLimit ?? null,
        },
      });

      const tenantAdmin = await getTenantAdminDetails(updatedTenant.id, updatedTenant.ownerAdminId, tx);
      const nextStats = await getBranchStats(updatedTenant.id, tx);
      const result = mapTenantBranchSummary({ tenant: updatedTenant, tenantAdmin, stats: nextStats });

      await auditService.recordAuditLog(tx, {
        tenantId: tenant.id,
        actorUserId: requester?.admin?.id || null,
        roleId: requester?.audit?.roleId || requester?.admin?.roleId || requester?.admin?.role_id || null,
        action: tenant.branchEnabled !== updatedTenant.branchEnabled ? 'tenant.branch_system.changed' : 'tenant.branch_settings.updated',
        module: 'tenants',
        targetType: 'tenant',
        targetId: tenant.id,
        oldValue: {
          branchEnabled: Boolean(tenant.branchEnabled),
          branchLimit: tenant.branchLimit,
        },
        newValue: {
          branchEnabled: Boolean(updatedTenant.branchEnabled),
          branchLimit: updatedTenant.branchLimit,
        },
        ipAddress: requester?.audit?.ipAddress || null,
        userAgent: requester?.audit?.userAgent || null,
      });

      return result;
    });
  },

  async updateTenantBranchLimit(id, payload, requester = {}) {
    return prisma.$transaction(async (tx) => {
      const tenant = await getTenantOrThrow(id, tx);
      const stats = await getBranchStats(tenant.id, tx);
      const branchLimit = payload.branchLimit;

      validateBranchSettingsAgainstCount({
        branchEnabled: Boolean(tenant.branchEnabled),
        branchLimit,
        branchesCreated: stats.branchesCreated,
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          branchLimit: branchLimit ?? null,
        },
      });

      const tenantAdmin = await getTenantAdminDetails(updatedTenant.id, updatedTenant.ownerAdminId, tx);
      const nextStats = await getBranchStats(updatedTenant.id, tx);
      const result = mapTenantBranchSummary({ tenant: updatedTenant, tenantAdmin, stats: nextStats });

      await auditService.recordAuditLog(tx, {
        tenantId: tenant.id,
        actorUserId: requester?.admin?.id || null,
        roleId: requester?.audit?.roleId || requester?.admin?.roleId || requester?.admin?.role_id || null,
        action: 'tenant.branch_limit.updated',
        module: 'tenants',
        targetType: 'tenant',
        targetId: tenant.id,
        oldValue: { branchLimit: tenant.branchLimit },
        newValue: { branchLimit: updatedTenant.branchLimit },
        ipAddress: requester?.audit?.ipAddress || null,
        userAgent: requester?.audit?.userAgent || null,
      });

      return result;
    });
  },

  async createTenant(payload) {
    const subdomain = emptyToNull(payload.subdomain);
    const customDomain = normalizeOptionalDomain(payload.customDomain);
    const adminPayload = payload.admin || {};
    const profilePayload = payload.profile || {};

    await assertTenantCodeAvailable(payload.tenantCode);
    assertCustomDomainAllowed(customDomain);
    await assertDomainAvailable({ subdomain, customDomain });

    try {
      return await prisma.$transaction(async (tx) => {
        const hashedPassword = await bcrypt.hash(adminPayload.password, 12);

        const tenant = await tx.tenant.create({
          data: {
            tenantCode: payload.tenantCode,
            name: payload.name,
            subdomain,
            customDomain,
            status: payload.status || 'active',
            branchEnabled: Boolean(payload.branchEnabled),
            branchLimit: payload.branchEnabled ? payload.branchLimit : payload.branchLimit || null,
          },
        });
        const seededRoles = await seedDefaultTenantRoles(tx, tenant.id);
        const adminRole = seededRoles.admin;

        const tenantAdmin = await tx.admin.create({
          data: {
            name: adminPayload.name,
            email: adminPayload.email,
            username: adminPayload.username,
            password: hashedPassword,
            role: adminRole?.roleName || 'admin',
            roleId: adminRole?.id || null,
            tenantId: tenant.id,
            status: 'active',
          },
        });

        const updatedTenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: { ownerAdminId: tenantAdmin.id },
        });

        if (adminRole?.id) {
          await tx.$executeRaw`
            UPDATE roles
            SET
              created_by = COALESCE(created_by, ${tenantAdmin.id}),
              updated_by = ${tenantAdmin.id}
            WHERE tenant_id = ${tenant.id}
              AND role_name IN ('admin', 'teacher', 'accountant', 'receptionist', 'read_only')
          `;
        }

        const madrassaProfile = await tx.madrassaProfile.create({
          data: {
            adminId: tenantAdmin.id,
            tenantId: tenant.id,
            name: profilePayload.name || payload.name,
            email: profilePayload.email || adminPayload.email,
            phone1: emptyToNull(profilePayload.phone1),
            phone2: emptyToNull(profilePayload.phone2),
            address: emptyToNull(profilePayload.address),
            branch: emptyToNull(profilePayload.branch) || 'Main Campus',
            city: emptyToNull(profilePayload.city),
            familyNoSeq: emptyToNull(profilePayload.familyNoSeq),
            regNo: emptyToNull(profilePayload.regNo),
            logoUrl: emptyToNull(profilePayload.logoUrl),
            status: 'active',
          },
        });

        return {
          ...mapTenant(updatedTenant),
          tenantAdmin: mapTenantAdmin(tenantAdmin),
          madrassaProfile: mapMadrassaProfile(madrassaProfile),
        };
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : String(error.meta?.target || '');
        if (target.includes('tenantCode')) throw new AppError('Tenant code is already in use.', 409);
        if (target.includes('subdomain')) throw new AppError('Subdomain is already assigned to another tenant.', 409);
        if (target.includes('customDomain')) throw new AppError('Custom domain is already assigned to another tenant.', 409);
        throw new AppError('Tenant setup contains duplicate data.', 409);
      }

      throw error;
    }
  },

  async getTenants(query = {}) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const search = query.search || null;
    const status = query.status || null;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { tenantCode: { contains: search } },
              { subdomain: { contains: search } },
              { customDomain: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tenant.count({ where }),
    ]);

    return {
      items: items.map(mapTenant),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getTenantById(id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new AppError('Tenant not found.', 404);
    }

    return mapTenant(tenant);
  },

  async updateTenant(id, payload) {
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new AppError('Tenant not found.', 404);
    }

    const subdomain = Object.prototype.hasOwnProperty.call(payload, 'subdomain')
      ? emptyToNull(payload.subdomain)
      : existingTenant.subdomain;
    const customDomain = Object.prototype.hasOwnProperty.call(payload, 'customDomain')
      ? normalizeOptionalDomain(payload.customDomain)
      : existingTenant.customDomain;
    const ownerAdminId = Object.prototype.hasOwnProperty.call(payload, 'ownerAdminId')
      ? payload.ownerAdminId || null
      : existingTenant.ownerAdminId;
    const branchEnabled = Object.prototype.hasOwnProperty.call(payload, 'branchEnabled')
      ? Boolean(payload.branchEnabled)
      : existingTenant.branchEnabled;
    const branchLimit = Object.prototype.hasOwnProperty.call(payload, 'branchLimit')
      ? payload.branchLimit
      : existingTenant.branchLimit;

    if (
      Object.prototype.hasOwnProperty.call(payload, 'branchEnabled') ||
      Object.prototype.hasOwnProperty.call(payload, 'branchLimit')
    ) {
      const stats = await getBranchStats(existingTenant.id);
      validateBranchSettingsAgainstCount({
        branchEnabled,
        branchLimit,
        branchesCreated: stats.branchesCreated,
        enforceLimitFloor: branchEnabled || Object.prototype.hasOwnProperty.call(payload, 'branchLimit'),
      });
    }

    assertCustomDomainAllowed(customDomain);
    await assertDomainAvailable({ subdomain, customDomain, excludeId: id });
    await assertOwnerExists(ownerAdminId);

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        subdomain,
        customDomain,
        ownerAdminId,
        branchEnabled,
        branchLimit: branchEnabled ? branchLimit : branchLimit || null,
        ...(payload.status ? { status: payload.status } : {}),
      },
    });

    return mapTenant(tenant);
  },
};
