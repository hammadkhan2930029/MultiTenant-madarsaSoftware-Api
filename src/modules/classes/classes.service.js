import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const classSelect = {
  id: true,
  name: true,
  branchId: true,
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
  _count: {
    select: {
      sections: true,
    },
  },
};

export const classesService = {
  async createClass(payload) {
    const branch = await prisma.branch.findUnique({
      where: { id: payload.branchId },
    });

    if (!branch) {
      throw new AppError('Selected branch not found.', 404);
    }

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        branchId: payload.branchId,
        name: payload.name,
      },
    });

    if (duplicateClass) {
      throw new AppError('Class with the same name already exists in this branch.', 409);
    }

    return prisma.academicClass.create({
      data: {
        name: payload.name,
        branchId: payload.branchId,
      },
      select: classSelect,
    });
  },

  async getClasses(query) {
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
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.academicClass.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: classSelect,
      }),
      prisma.academicClass.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getClassById(id) {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id },
      select: {
        ...classSelect,
        sections: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    return academicClass;
  },

  async updateClass(id, payload) {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    const branch = await prisma.branch.findUnique({
      where: { id: payload.branchId },
    });

    if (!branch) {
      throw new AppError('Selected branch not found.', 404);
    }

    const duplicateClass = await prisma.academicClass.findFirst({
      where: {
        id: { not: id },
        branchId: payload.branchId,
        name: payload.name,
      },
    });

    if (duplicateClass) {
      throw new AppError('Another class with the same name already exists in this branch.', 409);
    }

    return prisma.academicClass.update({
      where: { id },
      data: {
        name: payload.name,
        branchId: payload.branchId,
        status: payload.status || academicClass.status,
      },
      select: classSelect,
    });
  },

  async deactivateClass(id) {
    const academicClass = await prisma.academicClass.findUnique({
      where: { id },
    });

    if (!academicClass) {
      throw new AppError('Class not found.', 404);
    }

    if (academicClass.status === 'inactive') {
      throw new AppError('Class is already inactive.', 400);
    }

    return prisma.academicClass.update({
      where: { id },
      data: { status: 'inactive' },
      select: classSelect,
    });
  },
};
