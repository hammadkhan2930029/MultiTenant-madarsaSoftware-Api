import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { branchScopeService } from '../security/index.js';

const sessionSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  startDate: true,
  endDate: true,
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

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const validateBranchAccess = async (tenantId, branchId) => {
  if (!branchId) {
    throw new AppError('Branch context is required for session management.', 403);
  }

  return branchScopeService.validateBranchBelongsToTenant({
    tenantId,
    branchId,
    requireActive: true,
  });
};

const resolveSessionBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });
};

const getScopedSession = async (tenantId, id, branchId) => {
  const session = await prisma.academicSession.findFirst({
    where: { id: Number(id), tenantId, branchId },
    select: sessionSelect,
  });

  if (!session) {
    throw new AppError('Session not found.', 404);
  }

  return session;
};

export const sessionsService = {
  async createSession(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSessionBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const duplicateSession = await prisma.academicSession.findFirst({
      where: { tenantId: resolvedTenantId, branchId, name: payload.name },
    });

    if (duplicateSession) {
      throw new AppError('Session with the same name already exists in this branch.', 409);
    }

    return prisma.academicSession.create({
      data: {
        tenantId: resolvedTenantId,
        branchId,
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
      select: sessionSelect,
    });
  },

  async getSessions(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = await resolveSessionBranchId(resolvedTenantId, query, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const where = {
      tenantId: resolvedTenantId,
      branchId,
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.academicSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: sessionSelect,
      }),
      prisma.academicSession.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getSessionById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSessionBranchId(resolvedTenantId, {}, branchScope);
    return getScopedSession(resolvedTenantId, id, branchId);
  },

  async updateSession(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSessionBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);
    const session = await getScopedSession(resolvedTenantId, id, branchId);

    const duplicateSession = await prisma.academicSession.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        id: { not: Number(id) },
        name: payload.name,
      },
    });

    if (duplicateSession) {
      throw new AppError('Another session with the same name already exists.', 409);
    }

    return prisma.academicSession.update({
      where: { id: Number(id) },
      data: {
        tenantId: resolvedTenantId,
        branchId,
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status || session.status,
      },
      select: sessionSelect,
    });
  },

  async deleteSession(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSessionBranchId(resolvedTenantId, {}, branchScope);
    await getScopedSession(resolvedTenantId, id, branchId);

    const relatedRecords = await prisma.academicSession.findUnique({
      where: { id: Number(id) },
      select: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if ((relatedRecords?._count?.assignments || 0) > 0) {
      throw new AppError('This session cannot be deleted because related records exist.', 400);
    }

    return prisma.academicSession.delete({
      where: { id: Number(id) },
      select: sessionSelect,
    });
  },
};
