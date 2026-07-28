import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';
import { normalizeStatusFilter } from '../../utils/statusFilter.js';
import { branchScopeService } from '../security/index.js';

const subjectSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  name: true,
  detail: true,
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
    throw new AppError('Branch context is required for subject management.', 403);
  }

  return branchScopeService.validateBranchBelongsToTenant({
    tenantId,
    branchId,
    requireActive: true,
  });
};

const resolveSubjectBranchId = async (tenantId, queryOrPayload = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, queryOrPayload, branchScope, {
    requireActive: true,
  });
};

const getTenantSubject = async (tenantId, id, branchId) => {
  const subject = await prisma.subject.findFirst({
    where: { id: Number(id), tenantId, branchId },
    select: subjectSelect,
  });

  if (!subject) {
    throw new AppError('Subject not found.', 404);
  }

  return subject;
};

export const subjectsService = {
  async createSubject(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const existingSubject = await prisma.subject.findFirst({
      where: { tenantId: resolvedTenantId, branchId, name: payload.name },
    });

    if (existingSubject) {
      throw new AppError('Subject with the same name already exists in this branch.', 409);
    }

    return prisma.subject.create({
      data: {
        tenantId: resolvedTenantId,
        branchId,
        name: payload.name,
        detail: payload.detail || null,
        status: payload.status || 'active',
      },
      select: subjectSelect,
    });
  },

  async bulkCreateSubjects(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, payload, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);

    const normalizedRows = payload.subjects
      .map((item, index) => ({
        index,
        name: String(item.name || '').trim(),
        detail: String(item.detail || '').trim(),
      }))
      .filter((item) => item.name || item.detail);

    if (!normalizedRows.length) {
      throw new AppError('At least one subject name is required.', 400);
    }

    const rowErrors = [];
    const seenNames = new Map();
    const validRows = [];

    normalizedRows.forEach((row) => {
      if (!row.name) {
        rowErrors.push({
          index: row.index,
          message: 'Subject name is required.',
        });
        return;
      }

      const key = row.name.toLowerCase();
      if (seenNames.has(key)) {
        rowErrors.push({
          index: row.index,
          message: 'This subject is duplicated in the same form.',
        });
        return;
      }

      seenNames.set(key, row.index);
      validRows.push(row);
    });

    if (validRows.length) {
      const existingSubjects = await prisma.subject.findMany({
        where: {
          tenantId: resolvedTenantId,
          branchId,
          name: { in: validRows.map((row) => row.name) },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingSubjects.map((item) => item.name.toLowerCase()));

      validRows.forEach((row) => {
        if (existingNames.has(row.name.toLowerCase())) {
          rowErrors.push({
            index: row.index,
            message: 'This subject already exists.',
          });
        }
      });
    }

    if (rowErrors.length) {
      throw new AppError('Submitted subjects contain validation errors.', 409, { rows: rowErrors });
    }

    return prisma.$transaction(async (tx) => {
      const createdSubjects = [];

      for (const row of validRows) {
        const createdSubject = await tx.subject.create({
          data: {
            tenantId: resolvedTenantId,
            branchId,
            name: row.name,
            detail: row.detail || null,
            status: 'active',
          },
          select: subjectSelect,
        });
        createdSubjects.push(createdSubject);
      }

      return {
        items: createdSubjects,
        createdCount: createdSubjects.length,
      };
    });
  },

  async getSubjects(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, query, branchScope);
    await validateBranchAccess(resolvedTenantId, branchId);
    const status = normalizeStatusFilter(query.status);

    const where = {
      tenantId: resolvedTenantId,
      branchId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { detail: { contains: query.search } },
            ],
          }
        : {}),
      status,
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

  async getSubjectById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, {}, branchScope);
    return getTenantSubject(resolvedTenantId, id, branchId);
  },

  async updateSubject(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, payload, branchScope);
    const existingSubject = await getTenantSubject(resolvedTenantId, id, branchId);
    await validateBranchAccess(resolvedTenantId, branchId);

    const duplicateSubject = await prisma.subject.findFirst({
      where: {
        tenantId: resolvedTenantId,
        branchId,
        id: { not: Number(id) },
        name: payload.name,
      },
    });

    if (duplicateSubject) {
      throw new AppError('Another subject with the same name already exists.', 409);
    }

    return prisma.subject.update({
      where: { id: Number(id), tenantId: resolvedTenantId },
      data: {
        name: payload.name,
        detail: payload.detail || null,
        branchId,
        status: payload.status || existingSubject.status,
      },
      select: subjectSelect,
    });
  },

  async deleteSubject(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveSubjectBranchId(resolvedTenantId, {}, branchScope);
    await getTenantSubject(resolvedTenantId, id, branchId);

    return prisma.subject.delete({
      where: { id: Number(id), tenantId: resolvedTenantId },
      select: subjectSelect,
    });
  },
};
