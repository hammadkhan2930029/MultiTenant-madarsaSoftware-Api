import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const qualificationSelect = {
  id: true,
  title: true,
  category: true,
  level: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const qualificationsService = {
  async createQualification(payload) {
    const existingQualification = await prisma.qualification.findUnique({
      where: { title: payload.title },
    });

    if (existingQualification) {
      throw new AppError('Qualification with the same title already exists.', 409);
    }

    return prisma.qualification.create({
      data: {
        title: payload.title,
        category: payload.category || null,
        level: payload.level || null,
        status: payload.status || 'active',
      },
      select: qualificationSelect,
    });
  },

  async getQualifications(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
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

  async getQualificationById(id) {
    const qualification = await prisma.qualification.findUnique({
      where: { id },
      select: qualificationSelect,
    });

    if (!qualification) {
      throw new AppError('Qualification not found.', 404);
    }

    return qualification;
  },

  async updateQualification(id, payload) {
    const existingQualification = await prisma.qualification.findUnique({
      where: { id },
    });

    if (!existingQualification) {
      throw new AppError('Qualification not found.', 404);
    }

    const duplicateQualification = await prisma.qualification.findFirst({
      where: {
        id: { not: id },
        title: payload.title,
      },
    });

    if (duplicateQualification) {
      throw new AppError('Another qualification with the same title already exists.', 409);
    }

    return prisma.qualification.update({
      where: { id },
      data: {
        title: payload.title,
        category: payload.category || null,
        level: payload.level || null,
        status: payload.status || existingQualification.status,
      },
      select: qualificationSelect,
    });
  },

  async deleteQualification(id) {
    const existingQualification = await prisma.qualification.findUnique({
      where: { id },
    });

    if (!existingQualification) {
      throw new AppError('Qualification not found.', 404);
    }

    return prisma.qualification.delete({
      where: { id },
      select: qualificationSelect,
    });
  },
};
