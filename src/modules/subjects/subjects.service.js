import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const subjectSelect = {
  id: true,
  tenantId: true,
  name: true,
  detail: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const getTenantSubject = async (tenantId, id) => {
  const subject = await prisma.subject.findFirst({
    where: { id: Number(id), tenantId },
    select: subjectSelect,
  });

  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  return subject;
};

export const subjectsService = {
  async createSubject(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingSubject = await prisma.subject.findFirst({
      where: { tenantId: resolvedTenantId, name: payload.name },
    });

    if (existingSubject) {
      throw new AppError('Subject with the same name already exists.', 409);
    }

    return prisma.subject.create({
      data: {
        tenantId: resolvedTenantId,
        name: payload.name,
        detail: payload.detail || null,
        status: payload.status || 'active',
      },
      select: subjectSelect,
    });
  },

  async getSubjects(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { detail: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        select: subjectSelect,
      }),
      prisma.subject.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getSubjectById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return getTenantSubject(resolvedTenantId, id);
  },

  async updateSubject(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingSubject = await getTenantSubject(resolvedTenantId, id);

    const duplicateSubject = await prisma.subject.findFirst({
      where: {
        tenantId: resolvedTenantId,
        id: { not: Number(id) },
        name: payload.name,
      },
    });

    if (duplicateSubject) {
      throw new AppError('Another subject with the same name already exists.', 409);
    }

    return prisma.subject.update({
      where: { id: Number(id) },
      data: {
        name: payload.name,
        detail: payload.detail || null,
        status: payload.status || existingSubject.status,
      },
      select: subjectSelect,
    });
  },

  async deleteSubject(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantSubject(resolvedTenantId, id);

    return prisma.subject.delete({
      where: { id: Number(id) },
      select: subjectSelect,
    });
  },
};
