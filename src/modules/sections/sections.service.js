import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const sectionSelect = {
  id: true,
  name: true,
  classId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  class: {
    select: {
      id: true,
      name: true,
      status: true,
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
};

export const sectionsService = {
  async createSection(payload) {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id: payload.classId },
    });

    if (!academicClass) {
      throw new AppError('Selected class not found.', 404);
    }

    const duplicateSection = await prisma.section.findFirst({
      where: {
        classId: payload.classId,
        name: payload.name,
      },
    });

    if (duplicateSection) {
      throw new AppError('Section with the same name already exists in this class.', 409);
    }

    return prisma.section.create({
      data: {
        name: payload.name,
        classId: payload.classId,
      },
      select: sectionSelect,
    });
  },

  async getSections(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.section.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: sectionSelect,
      }),
      prisma.section.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getSectionById(id) {
    const section = await prisma.section.findUnique({
      where: { id },
      select: sectionSelect,
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    return section;
  },

  async updateSection(id, payload) {
    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    const academicClass = await prisma.academicClass.findUnique({
      where: { id: payload.classId },
    });

    if (!academicClass) {
      throw new AppError('Selected class not found.', 404);
    }

    const duplicateSection = await prisma.section.findFirst({
      where: {
        id: { not: id },
        classId: payload.classId,
        name: payload.name,
      },
    });

    if (duplicateSection) {
      throw new AppError('Another section with the same name already exists in this class.', 409);
    }

    return prisma.section.update({
      where: { id },
      data: {
        name: payload.name,
        classId: payload.classId,
        status: payload.status || section.status,
      },
      select: sectionSelect,
    });
  },

  async deactivateSection(id) {
    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      throw new AppError('Section not found.', 404);
    }

    if (section.status === 'inactive') {
      throw new AppError('Section is already inactive.', 400);
    }

    return prisma.section.update({
      where: { id },
      data: { status: 'inactive' },
      select: sectionSelect,
    });
  },
};
