import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeTenantId } from '../../utils/tenantGuard.js';
import { branchScopeService } from '../security/index.js';

const qualificationSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  title: true,
  category: true,
  level: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
};

const resolveQualificationBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });
};

const getScopedQualification = async (tenantId, id, branchId) => {
  const qualification = await prisma.qualification.findFirst({
    where: { id: Number(id), tenantId, branchId },
    select: qualificationSelect,
  });

  if (!qualification) {
    throw new AppError('Qualification not found.', 404);
  }

  return qualification;
};

export const qualificationsService = {
  async createQualification(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveQualificationBranchId(resolvedTenantId, payload, branchScope);

    const existingQualification = await prisma.qualification.findFirst({
      where: { tenantId: resolvedTenantId, branchId, title: payload.title },
    });

    if (existingQualification) {
      throw new AppError('Qualification with the same title already exists in this branch.', 409);
    }

    return prisma.qualification.create({
      data: {
        tenantId: resolvedTenantId,
        branchId,
        title: payload.title,
        category: payload.category || null,
        level: payload.level || null,
        status: payload.status || 'active',
      },
      select: qualificationSelect,
    });
  },

  async getQualifications(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveQualificationBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      branchId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { category: { contains: query.search } },
              { level: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.qualification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: qualificationSelect,
      }),
      prisma.qualification.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getQualificationById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveQualificationBranchId(resolvedTenantId, {}, branchScope);
    return getScopedQualification(resolvedTenantId, id, branchId);
  },

  async updateQualification(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveQualificationBranchId(resolvedTenantId, payload, branchScope);
    const existingQualification = await getScopedQualification(resolvedTenantId, id, branchId);

    const duplicateQualification = await prisma.qualification.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        id: { not: Number(id) },
        title: payload.title,
      },
    });

    if (duplicateQualification) {
      throw new AppError('Another qualification with the same title already exists.', 409);
    }

    return prisma.qualification.update({
      where: { id: Number(id) },
      data: {
        tenantId: resolvedTenantId,
        branchId,
        title: payload.title,
        category: payload.category || null,
        level: payload.level || null,
        status: payload.status || existingQualification.status,
      },
      select: qualificationSelect,
    });
  },

  async deleteQualification(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveQualificationBranchId(resolvedTenantId, {}, branchScope);
    await getScopedQualification(resolvedTenantId, id, branchId);

    return prisma.qualification.delete({
      where: { id: Number(id) },
      select: qualificationSelect,
    });
  },
};
