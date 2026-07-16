import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { branchScopeService } from '../../security/index.js';

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeDate = (value, endOfDay = false) => {
  const date = new Date(value);
  date.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date;
};

const buildDateRangeWhere = (fromDate, toDate, fieldName) =>
  fromDate || toDate
    ? {
        [fieldName]: {
          ...(fromDate ? { gte: normalizeDate(fromDate) } : {}),
          ...(toDate ? { lte: normalizeDate(toDate, true) } : {}),
        },
      }
    : {};

const toAmount = (value) => Number(value || 0);

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, query = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || query.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({ tenantId, branchId, requireActive: true });
  }
  return branchId;
};

export const reportsService = {
  async getFinanceSummary(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const dateFilter = buildDateRangeWhere(query.fromDate, query.toDate, 'paymentDate');

    const [fundCollections, salaryEntries, feeVouchers, transactions] = await Promise.all([
      prisma.fundCollection.findMany({
        where: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), status: 'active', ...dateFilter },
        select: { amount: true },
      }),
      prisma.salaryEntry.findMany({
        where: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}), teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) }, status: 'active', ...dateFilter },
        select: { amount: true },
      }),
      prisma.studentFeeVoucher.findMany({
        where: {
          tenantId: resolvedTenantId,
          student: {
            tenantId: resolvedTenantId,
            ...(branchId
              ? { OR: [{ branchId }, { assignments: { some: { tenantId: resolvedTenantId, branchId, status: 'active' } } }] }
              : {}),
          },
          status: { in: ['paid', 'partial'] },
          paidAmount: { gt: 0 },
          ...buildDateRangeWhere(query.fromDate, query.toDate, 'paidDate'),
        },
        select: { paidAmount: true },
      }),
      prisma.financeTransaction.findMany({
        where: {
          tenantId: resolvedTenantId,
          ...(branchId ? { branchId } : {}),
          status: 'active',
          ...buildDateRangeWhere(query.fromDate, query.toDate, 'transactionDate'),
        },
        select: { type: true, amount: true },
      }),
    ]);

    const fundIncome = fundCollections.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const feeIncome = feeVouchers.reduce((sum, item) => sum + toAmount(item.paidAmount), 0);
    const transactionIncome = transactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + toAmount(item.amount), 0);
    const salaryExpense = salaryEntries.reduce((sum, item) => sum + toAmount(item.amount), 0);
    const transactionExpense = transactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + toAmount(item.amount), 0);

    const totalIncome = fundIncome + feeIncome + transactionIncome;
    const totalExpense = salaryExpense + transactionExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      fromDate: query.fromDate || null,
      toDate: query.toDate || null,
    };
  },

  async getStudentFundHistory(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id: query.studentId,
        tenantId: resolvedTenantId,
        ...(branchId
          ? { OR: [{ branchId }, { assignments: { some: { tenantId: resolvedTenantId, branchId, status: 'active' } } }] }
          : {}),
      },
      select: { id: true, admissionNumber: true, fullName: true },
    });
    if (!student) throw new AppError('Student not found.', 404);

    const entries = await prisma.studentFeeVoucher.findMany({
      where: {
        tenantId: resolvedTenantId,
        studentId: query.studentId,
        paidAmount: { gt: 0 },
        ...buildDateRangeWhere(query.fromDate, query.toDate, 'paidDate'),
      },
      orderBy: [{ paidDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        voucherNo: true,
        paidAmount: true,
        paidDate: true,
        remarks: true,
        status: true,
      },
    });

    return {
      student,
      history: entries.map((entry) => ({
        id: entry.id,
        amount: entry.paidAmount,
        paymentDate: entry.paidDate,
        remarks: entry.remarks || entry.voucherNo,
        status: entry.status,
        financeHead: { id: null, name: 'Student Fees', type: 'income' },
      })),
    };
  },

  async getTeacherSalaryHistory(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const branchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const teacher = await prisma.teacher.findFirst({
      where: { id: query.teacherId, tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
      select: { id: true, fullName: true, subject: true, phone: true },
    });
    if (!teacher) throw new AppError('Teacher not found.', 404);

    const entries = await prisma.salaryEntry.findMany({
      where: {
        tenantId: resolvedTenantId,
        teacherId: query.teacherId,
        ...(branchId ? { branchId } : {}),
        teacher: { tenantId: resolvedTenantId, ...(branchId ? { branchId } : {}) },
        ...buildDateRangeWhere(query.fromDate, query.toDate, 'paymentDate'),
      },
      orderBy: [{ salaryYear: 'desc' }, { salaryMonth: 'desc' }],
      select: {
        id: true,
        amount: true,
        salaryMonth: true,
        salaryYear: true,
        paymentDate: true,
        remarks: true,
        status: true,
        financeHead: { select: { id: true, name: true, type: true } },
      },
    });

    return {
      teacher,
      history: entries,
    };
  },
};
