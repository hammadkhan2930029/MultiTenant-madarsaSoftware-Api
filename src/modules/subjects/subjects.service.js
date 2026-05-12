import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const subjectSelect = {
  id: true,
  name: true,
  detail: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const subjectsService = {
  async createSubject(payload) {
    const existingSubject = await prisma.subject.findUnique({
      where: { name: payload.name },
    });

    if (existingSubject) {
      throw new AppError('Subject with the same name already exists.', 409);
    }

    return prisma.subject.create({
      data: {
        name: payload.name,
        detail: payload.detail || null,
        status: payload.status || 'active',
      },
      select: subjectSelect,
    });
  },

  async getSubjects(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
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

  async getSubjectById(id) {
    const subject = await prisma.subject.findUnique({
      where: { id: Number(id) },
      select: subjectSelect,
    });

    if (!subject) {
      throw new AppError('Subject not found.', 404);
    }

    return subject;
  },

  async updateSubject(id, payload) {
    const existingSubject = await prisma.subject.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSubject) {
      throw new AppError('Subject not found.', 404);
    }

    const duplicateSubject = await prisma.subject.findFirst({
      where: {
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

  async deactivateSubject(id) {
    const existingSubject = await prisma.subject.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSubject) {
      throw new AppError('Subject not found.', 404);
    }

    if (existingSubject.status === 'inactive') {
      throw new AppError('Subject is already inactive.', 400);
    }

    return prisma.subject.update({
      where: { id: Number(id) },
      data: { status: 'inactive' },
      select: subjectSelect,
    });
  },
};
