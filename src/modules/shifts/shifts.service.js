import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const shiftSelect = {
  id: true,
  name: true,
  startTime: true,
  endTime: true,
  type: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const shiftsService = {
  async createShift(payload) {
    const existingShift = await prisma.shift.findUnique({
      where: { name: payload.name },
    });

    if (existingShift) {
      throw new AppError('Shift with the same name already exists.', 409);
    }

    return prisma.shift.create({
      data: {
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        type: payload.type,
        status: payload.status || 'active',
      },
      select: shiftSelect,
    });
  },

  async getShifts(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { type: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: shiftSelect,
      }),
      prisma.shift.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getShiftById(id) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      select: shiftSelect,
    });

    if (!shift) {
      throw new AppError('Shift not found.', 404);
    }

    return shift;
  },

  async updateShift(id, payload) {
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!existingShift) {
      throw new AppError('Shift not found.', 404);
    }

    const duplicateShift = await prisma.shift.findFirst({
      where: {
        id: { not: id },
        name: payload.name,
      },
    });

    if (duplicateShift) {
      throw new AppError('Another shift with the same name already exists.', 409);
    }

    return prisma.shift.update({
      where: { id },
      data: {
        name: payload.name,
        startTime: payload.startTime,
        endTime: payload.endTime,
        type: payload.type,
        status: payload.status || existingShift.status,
      },
      select: shiftSelect,
    });
  },

  async deleteShift(id) {
    const existingShift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!existingShift) {
      throw new AppError('Shift not found.', 404);
    }

    return prisma.shift.delete({
      where: { id },
      select: shiftSelect,
    });
  },
};
