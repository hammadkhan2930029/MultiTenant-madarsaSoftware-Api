import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const sessionSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export const sessionsService = {
  async createSession(payload) {
    const duplicateSession = await prisma.academicSession.findFirst({
      where: { name: payload.name },
    });

    if (duplicateSession) {
      throw new AppError('Session with the same name already exists.', 409);
    }

    return prisma.academicSession.create({
      data: {
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
      select: sessionSelect,
    });
  },

  async getSessions(query) {
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
    };

    const [items, totalItems] = await Promise.all([
      prisma.academicSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: sessionSelect,
      }),
      prisma.academicSession.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getSessionById(id) {
    const session = await prisma.academicSession.findUnique({
      where: { id },
      select: sessionSelect,
    });

    if (!session) {
      throw new AppError('Session not found.', 404);
    }

    return session;
  },

  async updateSession(id, payload) {
    const session = await prisma.academicSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new AppError('Session not found.', 404);
    }

    const duplicateSession = await prisma.academicSession.findFirst({
      where: {
        id: { not: id },
        name: payload.name,
      },
    });

    if (duplicateSession) {
      throw new AppError('Another session with the same name already exists.', 409);
    }

    return prisma.academicSession.update({
      where: { id },
      data: {
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status || session.status,
      },
      select: sessionSelect,
    });
  },

  async deleteSession(id) {
    const session = await prisma.academicSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new AppError('Session not found.', 404);
    }

    const relatedRecords = await prisma.academicSession.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if ((relatedRecords?._count?.assignments || 0) > 0) {
      throw new AppError('This session cannot be deleted because related records exist.', 400);
    }

    return prisma.academicSession.delete({
      where: { id },
      select: sessionSelect,
    });
  },
};
