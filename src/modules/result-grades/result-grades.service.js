import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const resultGradeSelect = {
  id: true,
  tenantId: true,
  title: true,
  code: true,
  fromPercent: true,
  toPercent: true,
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

const formatResultGrade = (grade) => ({
  id: grade.id,
  tenantId: grade.tenantId,
  title: grade.title,
  code: grade.code || '',
  from: grade.fromPercent,
  to: grade.toPercent,
  status: grade.status,
  createdAt: grade.createdAt,
  updatedAt: grade.updatedAt,
});

const ensureNoOverlap = async (tenantId, { from, to, excludeId }) => {
  const overlappingGrade = await prisma.resultGrade.findFirst({
    where: {
      tenantId,
      status: 'active',
      ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
      fromPercent: { lte: to },
      toPercent: { gte: from },
    },
    select: { id: true, title: true, fromPercent: true, toPercent: true },
  });

  if (overlappingGrade) {
    throw new AppError('This percentage range overlaps with an existing grade range.', 409);
  }
};

const buildData = (tenantId, payload) => ({
  tenantId,
  title: payload.title,
  code: payload.code || null,
  fromPercent: payload.from,
  toPercent: payload.to,
  status: payload.status || 'active',
});

const getTenantResultGrade = async (tenantId, id) => {
  const result = await prisma.resultGrade.findFirst({
    where: { id: Number(id), tenantId },
    select: resultGradeSelect,
  });

  if (!result) {
    throw new AppError('Result grade not found.', 404);
  }

  return result;
};

export const resultGradesService = {
  async createResultGrade(tenantId, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureNoOverlap(resolvedTenantId, { from: payload.from, to: payload.to });

    const result = await prisma.resultGrade.create({
      data: buildData(resolvedTenantId, payload),
      select: resultGradeSelect,
    });

    return formatResultGrade(result);
  },

  async getResultGrades(tenantId, query) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      tenantId: resolvedTenantId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { code: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.resultGrade.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ fromPercent: 'desc' }, { id: 'asc' }],
        select: resultGradeSelect,
      }),
      prisma.resultGrade.count({ where }),
    ]);

    return {
      items: items.map(formatResultGrade),
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getResultGradeById(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return formatResultGrade(await getTenantResultGrade(resolvedTenantId, id));
  },

  async updateResultGrade(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existingGrade = await getTenantResultGrade(resolvedTenantId, id);

    if ((payload.status || existingGrade.status) === 'active') {
      await ensureNoOverlap(resolvedTenantId, { from: payload.from, to: payload.to, excludeId: id });
    }

    const result = await prisma.resultGrade.update({
      where: { id: Number(id) },
      data: buildData(resolvedTenantId, payload),
      select: resultGradeSelect,
    });

    return formatResultGrade(result);
  },

  async deleteResultGrade(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await getTenantResultGrade(resolvedTenantId, id);

    const result = await prisma.resultGrade.delete({
      where: { id: Number(id) },
      select: resultGradeSelect,
    });

    return formatResultGrade(result);
  },
};
