import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const branchSelect = {
  id: true,
  name: true,
  code: true,
  address: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      classes: true,
    },
  },
};

export const branchesService = {
  async createBranch(payload) {
    const existingBranch = await prisma.branch.findFirst({
      where: {
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (existingBranch) {
      throw new AppError('Branch with the same name or code already exists.', 409);
    }

    return prisma.branch.create({
      data: {
        name: payload.name,
        code: payload.code || null,
        address: payload.address || null,
      },
      select: branchSelect,
    });
  },

  async getBranches(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { address: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: branchSelect,
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getBranchById(id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      select: {
        ...branchSelect,
        classes: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!branch) {
      throw new AppError('Branch not found.', 404);
    }

    return branch;
  },

  async updateBranch(id, payload) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new AppError('Branch not found.', 404);
    }

    const duplicateBranch = await prisma.branch.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (duplicateBranch) {
      throw new AppError('Another branch with the same name or code already exists.', 409);
    }

    return prisma.branch.update({
      where: { id },
      data: {
        name: payload.name,
        code: payload.code || null,
        address: payload.address || null,
        status: payload.status || branch.status,
      },
      select: branchSelect,
    });
  },

  async deactivateBranch(id) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new AppError('Branch not found.', 404);
    }

    if (branch.status === 'inactive') {
      throw new AppError('Branch is already inactive.', 400);
    }

    return prisma.branch.update({
      where: { id },
      data: { status: 'inactive' },
      select: branchSelect,
    });
  },
};
