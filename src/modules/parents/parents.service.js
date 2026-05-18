import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const parentSelect = {
  id: true,
  fullName: true,
  familyNumber: true,
  phone: true,
  email: true,
  cnic: true,
  occupation: true,
  address: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  students: {
    select: {
      relationship: true,
      isPrimary: true,
      student: {
        select: {
          id: true,
          admissionNumber: true,
          fullName: true,
          status: true,
        },
      },
    },
  },
};

const generateFamilyNumber = (id) => `F-${String(id).padStart(4, '0')}`;

const ensureFamilyNumberUnique = async (familyNumber, excludeId) => {
  if (!familyNumber) return;

  const existingParent = await prisma.parent.findFirst({
    where: {
      familyNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existingParent) {
    throw new AppError('Family number already exists.', 409);
  }
};

const buildDuplicateParentWhere = (payload, excludeId) => ({
  AND: [
    { fullName: payload.fullName },
    {
      OR: [
        ...(payload.phone ? [{ phone: payload.phone }] : []),
        ...(payload.email ? [{ email: payload.email }] : []),
      ],
    },
    ...(excludeId ? [{ id: { not: excludeId } }] : []),
  ],
});

export const parentsService = {
  async createParent(payload) {
    await ensureFamilyNumberUnique(payload.familyNumber);

    if (payload.phone || payload.email) {
      const duplicateParent = await prisma.parent.findFirst({
        where: buildDuplicateParentWhere(payload),
      });

      if (duplicateParent) {
        throw new AppError('Parent with similar details already exists.', 409);
      }
    }

    const createdParent = await prisma.parent.create({
      data: {
        fullName: payload.fullName,
        familyNumber: payload.familyNumber || null,
        phone: payload.phone || null,
        email: payload.email || null,
        cnic: payload.cnic || null,
        occupation: payload.occupation || null,
        address: payload.address || null,
      },
      select: {
        id: true,
        familyNumber: true,
      },
    });

    if (!createdParent.familyNumber) {
      await prisma.parent.update({
        where: { id: createdParent.id },
        data: {
          familyNumber: generateFamilyNumber(createdParent.id),
        },
      });
    }

    return prisma.parent.findUnique({
      where: { id: createdParent.id },
      select: parentSelect,
    });
  },

  async getParents(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { familyNumber: { contains: query.search } },
              { phone: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: parentSelect,
      }),
      prisma.parent.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getParentById(id) {
    const parent = await prisma.parent.findUnique({
      where: { id },
      select: parentSelect,
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    return parent;
  },

  async updateParent(id, payload) {
    const existingParent = await prisma.parent.findUnique({
      where: { id },
    });

    if (!existingParent) {
      throw new AppError('Parent not found.', 404);
    }

    await ensureFamilyNumberUnique(payload.familyNumber, id);

    if (payload.phone || payload.email) {
      const duplicateParent = await prisma.parent.findFirst({
        where: buildDuplicateParentWhere(payload, id),
      });

      if (duplicateParent) {
        throw new AppError('Another parent with similar details already exists.', 409);
      }
    }

    return prisma.parent.update({
      where: { id },
      data: {
        fullName: payload.fullName,
        familyNumber: payload.familyNumber || null,
        phone: payload.phone || null,
        email: payload.email || null,
        cnic: payload.cnic || null,
        occupation: payload.occupation || null,
        address: payload.address || null,
        status: payload.status || existingParent.status,
      },
      select: parentSelect,
    });
  },

  async deactivateParent(id) {
    const parent = await prisma.parent.findUnique({
      where: { id },
    });

    if (!parent) {
      throw new AppError('Parent not found.', 404);
    }

    if (parent.status === 'inactive') {
      throw new AppError('Parent is already inactive.', 400);
    }

    return prisma.parent.update({
      where: { id },
      data: { status: 'inactive' },
      select: parentSelect,
    });
  },
};
