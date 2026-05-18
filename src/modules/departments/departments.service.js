import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const departmentSelect = {
  id: true,
  name: true,
  code: true,
  head: true,
  members: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const departmentsService = {
  async createDepartment(payload) {
    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (existingDepartment) {
      throw new AppError('Department with the same name or code already exists.', 409);
    }

    return prisma.department.create({
      data: {
        name: payload.name,
        code: payload.code || null,
        head: payload.head || null,
        members: payload.members ?? 0,
        status: payload.status || 'active',
      },
      select: departmentSelect,
    });
  },

  async getDepartments(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    const where = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { head: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: departmentSelect,
      }),
      prisma.department.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getDepartmentById(id) {
    const department = await prisma.department.findUnique({
      where: { id },
      select: departmentSelect,
    });

    if (!department) {
      throw new AppError('Department not found.', 404);
    }

    return department;
  },

  async updateDepartment(id, payload) {
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    const duplicateDepartment = await prisma.department.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code }] : [])],
      },
    });

    if (duplicateDepartment) {
      throw new AppError('Another department with the same name or code already exists.', 409);
    }

    return prisma.department.update({
      where: { id },
      data: {
        name: payload.name,
        code: payload.code || null,
        head: payload.head || null,
        members: payload.members ?? existingDepartment.members,
        status: payload.status || existingDepartment.status,
      },
      select: departmentSelect,
    });
  },

  async deleteDepartment(id) {
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new AppError('Department not found.', 404);
    }

    return prisma.department.delete({
      where: { id },
      select: departmentSelect,
    });
  },
};
