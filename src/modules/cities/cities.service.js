import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const citySelect = {
  id: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const citiesService = {
  async createCity(payload) {
    const existingCity = await prisma.city.findUnique({
      where: { name: payload.name },
    });

    if (existingCity) {
      if (existingCity.status === 'inactive') {
        return prisma.city.update({
          where: { id: existingCity.id },
          data: { status: 'active' },
          select: citySelect,
        });
      }

      throw new AppError('City with the same name already exists.', 409);
    }

    return prisma.city.create({
      data: {
        name: payload.name,
        status: payload.status || 'active',
      },
      select: citySelect,
    });
  },

  async getCities(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search ? { name: { contains: query.search } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: citySelect,
      }),
      prisma.city.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getCityById(id) {
    const city = await prisma.city.findUnique({
      where: { id },
      select: citySelect,
    });

    if (!city) {
      throw new AppError('City not found.', 404);
    }

    return city;
  },

  async updateCity(id, payload) {
    const existingCity = await prisma.city.findUnique({
      where: { id },
    });

    if (!existingCity) {
      throw new AppError('City not found.', 404);
    }

    const duplicateCity = await prisma.city.findFirst({
      where: {
        id: { not: id },
        name: payload.name,
      },
    });

    if (duplicateCity) {
      throw new AppError('Another city with the same name already exists.', 409);
    }

    return prisma.city.update({
      where: { id },
      data: {
        name: payload.name,
        status: payload.status || existingCity.status,
      },
      select: citySelect,
    });
  },

  async deactivateCity(id) {
    const existingCity = await prisma.city.findUnique({
      where: { id },
    });

    if (!existingCity) {
      throw new AppError('City not found.', 404);
    }

    if (existingCity.status === 'inactive') {
      throw new AppError('City is already inactive.', 400);
    }

    const profileUsingCity = await prisma.madrassaProfile.findFirst({
      where: { city: existingCity.name },
      select: { id: true },
    });

    if (profileUsingCity) {
      throw new AppError('This city cannot be deleted because it is used in profile settings.', 400);
    }

    return prisma.city.update({
      where: { id },
      data: {
        status: 'inactive',
      },
      select: citySelect,
    });
  },
};
