import { prisma } from '../../config/prisma.js';
import { AppError } from '../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const scheduleSelect = {
  id: true,
  tenantId: true,
  subjects: true,
  days: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  session: { select: { id: true, name: true, startDate: true, endDate: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } },
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const ensureScheduleReferences = async (tenantId, { sessionId, classId, sectionId }, branchId = null) => {
  const [session, academicClass, section] = await Promise.all([
    prisma.academicSession.findUnique({ where: { id: sessionId } }),
    prisma.academicClass.findFirst({
      where: { id: classId, tenantId, ...(branchId ? { branchId } : {}), branch: { status: 'active' } },
    }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId } }),
  ]);

  if (!session || session.status !== 'active') {
    throw new AppError('Active session not found.', 404);
  }

  if (!academicClass || academicClass.status !== 'active') {
    throw new AppError('Active class or branch not found.', 404);
  }

  if (!section || section.status !== 'active') {
    throw new AppError('Active section not found.', 404);
  }

  if (section.classId !== classId) {
    throw new AppError('Section does not belong to the selected class.', 400);
  }
};

export const schedulesService = {
  async createSchedule(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    await ensureScheduleReferences(resolvedTenantId, payload, getScopedBranchId(branchScope));

    return prisma.studentSchedule.create({
      data: {
        tenantId: resolvedTenantId,
        sessionId: payload.sessionId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjects: payload.subjects,
        days: payload.days,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status || 'active',
      },
      select: scheduleSelect,
    });
  },

  async getSchedules(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const branchId = getScopedBranchId(branchScope) || query.branchId || null;
    const where = {
      tenantId: resolvedTenantId,
      class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      section: { tenantId: resolvedTenantId },
      ...(query.sessionId ? { sessionId: query.sessionId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      status: query.status || 'active',
    };

    const [items, totalItems] = await Promise.all([
      prisma.studentSchedule.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        select: scheduleSelect,
      }),
      prisma.studentSchedule.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async updateSchedule(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const existingSchedule = await prisma.studentSchedule.findFirst({
      where: { id, tenantId: resolvedTenantId, class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) }, section: { tenantId: resolvedTenantId } },
    });

    if (!existingSchedule) {
      throw new AppError('Schedule not found.', 404);
    }

    await ensureScheduleReferences(resolvedTenantId, payload, branchId);

    return prisma.studentSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        sessionId: payload.sessionId,
        tenantId: resolvedTenantId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        subjects: payload.subjects,
        days: payload.days,
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status || existingSchedule.status,
      },
      select: scheduleSelect,
    });
  },

  async deleteSchedule(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = getScopedBranchId(branchScope);
    const schedule = await prisma.studentSchedule.findFirst({
      where: { id, tenantId: resolvedTenantId, class: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) }, section: { tenantId: resolvedTenantId } },
    });

    if (!schedule) {
      throw new AppError('Schedule not found.', 404);
    }

    return prisma.studentSchedule.update({
      where: { id, tenantId: resolvedTenantId },
      data: { status: 'inactive' },
      select: scheduleSelect,
    });
  },
};
