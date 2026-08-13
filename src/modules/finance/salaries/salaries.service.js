import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { normalizeStatusFilter } from '../../../utils/statusFilter.js';
import { branchScopeService } from '../../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const select = {
  id: true,
  tenantId: true,
  branchId: true,
  amount: true,
  salaryMonth: true,
  salaryYear: true,
  paymentDate: true,
  paymentMethod: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, tenantId: true, fullName: true, phone: true, subject: true, staffType: true, appointmentDate: true, joiningDate: true, createdAt: true } },
  financeHead: { select: { id: true, name: true, type: true } },
};

const teacherLookupSelect = {
  id: true,
  tenantId: true,
  branchId: true,
  fullName: true,
  phone: true,
  subject: true,
  staffType: true,
  basicSalary: true,
  appointmentDate: true,
  joiningDate: true,
  createdAt: true,
  teachingAssignments: {
    where: { status: 'active' },
    select: {
      responsibility: {
        select: { id: true, name: true },
      },
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
};

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getTeacherStartDate = (teacher) => {
  const value = teacher?.joiningDate || teacher?.appointmentDate || teacher?.createdAt;
  return value ? normalizeDate(value) : null;
};

const getSalaryMonthDate = ({ salaryMonth, salaryYear }) => {
  const date = new Date(Number(salaryYear), Number(salaryMonth) - 1, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const ensureTeacherIsEligibleForSalaryDate = (teacher, payload) => {
  const startDate = getTeacherStartDate(teacher);
  if (!startDate) return;

  const salaryDate = getSalaryMonthDate(payload);
  const salaryStartMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  salaryStartMonth.setHours(0, 0, 0, 0);
  const paymentDate = normalizeDate(payload.paymentDate);

  if (salaryDate < salaryStartMonth || paymentDate < startDate) {
    throw new AppError('Ø§Ø³ ØªØ§Ø±ÛŒØ® ÛŒØ§ Ù…ÛÛŒÙ†Û’ Ù…ÛŒÚº Ø§Ø³ØªØ§Ø¯/Ø¹Ù…Ù„Û Ø§Ø¨Ú¾ÛŒ Ø´Ø§Ù…Ù„ Ù†ÛÛŒÚº ÛÙˆØ§ ØªÚ¾Ø§Û”', 400);
  }
};

const resolveBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  return branchScopeService.resolveOperationalBranchId(tenantId, payloadOrQuery, branchScope, {
    requireActive: true,
  });
};

const findSalaryExpenseHead = async (tenantId, branchId = null, staffType = 'teacher') => {
  const expenseHeads = await prisma.financeHead.findMany({
    where: {
      tenantId,
      type: 'expense',
      status: 'active',
      ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : { branchId: null }),
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, branchId: true, name: true, type: true, status: true },
  });

  const scopedHeads = expenseHeads.sort((first, second) => Number(second.branchId === branchId) - Number(first.branchId === branchId));
  const preferredPattern = staffType === 'staff'
    ? /staff|other staff|عملہ|دیگر عملے/i
    : /teacher|ustad|استاد|اساتذہ|اساتزہ/i;

  return scopedHeads.find((head) => preferredPattern.test(head.name || ''))
    || scopedHeads.find((head) => /salary|payroll|تنخواہ|سیلری/i.test(head.name || ''))
    || scopedHeads[0]
    || null;
};

const ensureReferences = async (tenantId, { teacherId, financeHeadId }, branchId = null) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, tenantId, status: 'active', ...(branchId ? { branchId } : {}) },
  });
  if (!teacher) throw new AppError('Teacher not found.', 404);

  const selectedHead = financeHeadId
    ? await prisma.financeHead.findFirst({
        where: {
          id: financeHeadId,
          tenantId,
          type: 'expense',
          status: 'active',
          ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : { branchId: null }),
        },
      })
    : null;
  if (financeHeadId && !selectedHead) {
    throw new AppError('Selected finance head is not an active expense head for this branch.', 400);
  }

  const head = selectedHead || await findSalaryExpenseHead(tenantId, branchId, teacher.staffType);
  if (!head) throw new AppError('Finance head not found.', 404);
  return { financeHeadId: head.id, teacher };
};

export const salariesService = {
  async getPayableTeachers(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const status = normalizeStatusFilter(query.status);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      status,
      ...(query.staffType ? { staffType: query.staffType } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { phone: { contains: query.search } },
              { subject: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, totalItems] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: teacherLookupSelect,
      }),
      prisma.teacher.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async createEntry(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const status = normalizeStatusFilter(payload.status);
    const { financeHeadId, teacher } = await ensureReferences(resolvedTenantId, payload, branchId);
    ensureTeacherIsEligibleForSalaryDate(teacher, payload);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: {
        teacherId: payload.teacherId,
        tenantId: resolvedTenantId,
        salaryMonth: payload.salaryMonth,
        salaryYear: payload.salaryYear,
        teacher: { tenantId: resolvedTenantId },
        ...(branchId ? { branchId } : {}),
      },
    });
    if (duplicate?.status === 'active') {
      throw new AppError('Salary entry for this teacher and month already exists.', 409);
    }
    if (duplicate) {
      return prisma.salaryEntry.update({
        where: { id: duplicate.id, tenantId: resolvedTenantId },
        data: {
          ...payload,
          financeHeadId,
          branchId,
          paymentDate: normalizeDate(payload.paymentDate),
          paymentMethod: payload.paymentMethod || duplicate.paymentMethod || 'Cash',
          remarks: payload.remarks || null,
          status,
        },
        select,
      });
    }
    return prisma.salaryEntry.create({
      data: { ...payload, financeHeadId, tenantId: resolvedTenantId, branchId, paymentDate: normalizeDate(payload.paymentDate), paymentMethod: payload.paymentMethod || 'Cash', remarks: payload.remarks || null, status },
      select,
    });
  },
  async getEntries(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const status = normalizeStatusFilter(query.status);
    const where = {
      tenantId: resolvedTenantId,
      ...(branchId ? { branchId } : {}),
      teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), ...(query.staffType ? { staffType: query.staffType } : {}) },
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.salaryMonth ? { salaryMonth: query.salaryMonth } : {}),
      ...(query.salaryYear ? { salaryYear: query.salaryYear } : {}),
      ...(query.fromDate || query.toDate
        ? {
            paymentDate: {
              ...(query.fromDate ? { gte: normalizeDate(query.fromDate) } : {}),
              ...(query.toDate ? { lte: normalizeDate(query.toDate) } : {}),
            },
          }
        : {}),
      status,
    };
    const [items, totalItems] = await Promise.all([
      prisma.salaryEntry.findMany({ where, skip, take: limit, orderBy: [{ salaryYear: 'desc' }, { salaryMonth: 'desc' }, { id: 'desc' }], select }),
      prisma.salaryEntry.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },
  async getEntryById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, {}, branchScope);
    const entry = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } }, select });
    if (!entry) throw new AppError('Salary entry not found.', 404);
    return entry;
  },
  async updateEntry(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, payload, branchScope);
    const existing = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    const status = normalizeStatusFilter(payload.status, existing.status);
    const { financeHeadId, teacher } = await ensureReferences(resolvedTenantId, payload, branchId);
    ensureTeacherIsEligibleForSalaryDate(teacher, payload);
    const duplicate = await prisma.salaryEntry.findFirst({
      where: {
        id: { not: id },
        tenantId: resolvedTenantId,
        teacherId: payload.teacherId,
        salaryMonth: payload.salaryMonth,
        salaryYear: payload.salaryYear,
        teacher: { tenantId: resolvedTenantId },
        ...(branchId ? { branchId } : {}),
      },
    });
    if (duplicate) throw new AppError('Another salary entry for this teacher and month already exists.', 409);
    return prisma.salaryEntry.update({
      where: { id, tenantId: resolvedTenantId },
      data: { ...payload, financeHeadId, branchId, paymentDate: normalizeDate(payload.paymentDate), paymentMethod: payload.paymentMethod || existing.paymentMethod || 'Cash', remarks: payload.remarks || null, status },
      select,
    });
  },
  async deactivateEntry(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, {}, branchScope);
    const existing = await prisma.salaryEntry.findFirst({ where: { id, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) } } });
    if (!existing) throw new AppError('Salary entry not found.', 404);
    return prisma.salaryEntry.update({ where: { id, tenantId: resolvedTenantId }, data: { status: 'inactive' }, select });
  },
};
