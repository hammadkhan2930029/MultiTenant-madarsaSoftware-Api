import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const citySelect = {
  id: true,
  tenantId: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const normalizeTenantId = (tenantId) => (
  tenantId === null || tenantId === undefined || tenantId === '' ? null : Number(tenantId)
);

const buildCityScope = (tenantId, auth = {}) => {
  const resolvedTenantId = normalizeTenantId(tenantId ?? auth?.tenantId);

  if (resolvedTenantId) {
    return {
      tenantId: resolvedTenantId,
      where: { tenantId: resolvedTenantId },
    };
  }

  if (auth?.isSuperAdmin) {
    return {
      tenantId: null,
      where: {},
    };
  }

  throw new AppError('مدرسہ/ادارے کی معلومات دستیاب نہیں ہیں۔ دوبارہ لاگ اِن کریں۔', 403);
};

export const citiesService = {
  async createCity(tenantId, payload, auth = {}) {
    const scope = buildCityScope(tenantId, auth);
    const existingCity = await prisma.city.findFirst({
      where: {
        ...scope.where,
        name: payload.name,
      },
    });

    if (existingCity) {
      if (existingCity.status === 'inactive') {
        return prisma.city.update({
          where: { id: existingCity.id },
          data: { status: 'active' },
          select: citySelect,
        });
      }

      throw new AppError('یہ شہر پہلے سے موجود ہے۔', 409);
    }

    return prisma.city.create({
      data: {
        tenantId: scope.tenantId,
        name: payload.name,
        status: payload.status || 'active',
      },
      select: citySelect,
    });
  },

  async getCities(tenantId, query, auth = {}) {
    const scope = buildCityScope(tenantId, auth);
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...scope.where,
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

  async getCityById(tenantId, id, auth = {}) {
    const scope = buildCityScope(tenantId, auth);
    const city = await prisma.city.findFirst({
      where: {
        id,
        ...scope.where,
      },
      select: citySelect,
    });

    if (!city) {
      throw new AppError('شہر نہیں ملا۔', 404);
    }

    return city;
  },

  async updateCity(tenantId, id, payload, auth = {}) {
    const scope = buildCityScope(tenantId, auth);
    const existingCity = await prisma.city.findFirst({
      where: {
        id,
        ...scope.where,
      },
    });

    if (!existingCity) {
      throw new AppError('شہر نہیں ملا۔', 404);
    }

    const duplicateCity = await prisma.city.findFirst({
      where: {
        id: { not: id },
        ...scope.where,
        name: payload.name,
      },
    });

    if (duplicateCity) {
      throw new AppError('اس نام سے دوسرا شہر پہلے سے موجود ہے۔', 409);
    }

    return prisma.$transaction(async (tx) => {
      const updatedCity = await tx.city.update({
        where: { id },
        data: {
          name: payload.name,
          status: payload.status || existingCity.status,
        },
        select: citySelect,
      });

      if (scope.tenantId && existingCity.name !== payload.name) {
        await tx.madrassaProfile.updateMany({
          where: { tenantId: scope.tenantId, city: existingCity.name },
          data: { city: payload.name },
        });
        await tx.admin.updateMany({
          where: { tenantId: scope.tenantId, city: existingCity.name },
          data: { city: payload.name },
        });
      }

      return updatedCity;
    });
  },

  async deactivateCity(tenantId, id, auth = {}) {
    const scope = buildCityScope(tenantId, auth);
    const existingCity = await prisma.city.findFirst({
      where: {
        id,
        ...scope.where,
      },
    });

    if (!existingCity) {
      throw new AppError('شہر نہیں ملا۔', 404);
    }

    if (existingCity.status === 'inactive') {
      throw new AppError('یہ شہر پہلے ہی غیر فعال ہے۔', 400);
    }

    const profileUsingCity = scope.tenantId
      ? await prisma.madrassaProfile.findFirst({
        where: { tenantId: scope.tenantId, city: existingCity.name },
        select: { id: true },
      })
      : await prisma.madrassaProfile.findFirst({
        where: { city: existingCity.name },
        select: { id: true },
      });

    if (profileUsingCity) {
      throw new AppError('یہ شہر حذف نہیں ہو سکتا کیونکہ یہ پروفائل سیٹنگ میں استعمال ہو رہا ہے۔', 400);
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
