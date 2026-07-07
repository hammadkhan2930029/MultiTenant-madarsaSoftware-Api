import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { normalizeDomainName } from '../../utils/domain.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { seedDefaultTenantRoles } from '../roles/tenantRoleSeeder.service.js';

const mapTenant = (tenant) => ({
  id: tenant.id,
  tenantCode: tenant.tenantCode,
  name: tenant.name,
  subdomain: tenant.subdomain,
  customDomain: tenant.customDomain,
  status: tenant.status,
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

export const tenantsService = {
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
        ...(payload.status ? { status: payload.status } : {}),
      },
    });

    return mapTenant(tenant);
  },
};
