import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const manualSelect = {
  id: true,
  tenantId: true,
  type: true,
  category: true,
  description: true,
  amount: true,
  date: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, username: true } },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeStartDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeEndDate = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const toAmount = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getDurationRange = (duration) => {
  if (!duration || duration === 'all') return {};

  const now = new Date();
  const from = new Date(now);
  const to = normalizeEndDate(now);

  if (duration === 'daily') {
    return { fromDate: normalizeStartDate(now), toDate: to };
  }

  if (duration === 'weekly') {
    from.setDate(now.getDate() - 6);
    return { fromDate: normalizeStartDate(from), toDate: to };
  }

  if (duration === 'monthly') {
    return { fromDate: new Date(now.getFullYear(), now.getMonth(), 1), toDate: to };
  }

  if (duration === 'yearly') {
    return { fromDate: new Date(now.getFullYear(), 0, 1), toDate: to };
  }

  return {};
};

const getEffectiveDateRange = (query) => {
  const durationRange = getDurationRange(query.duration);
  return {
    fromDate: query.fromDate ? normalizeStartDate(query.fromDate) : durationRange.fromDate,
    toDate: query.toDate ? normalizeEndDate(query.toDate) : durationRange.toDate,
  };
};

const buildDateWhere = (fieldName, range) =>
  range.fromDate || range.toDate
    ? {
        [fieldName]: {
          ...(range.fromDate ? { gte: range.fromDate } : {}),
          ...(range.toDate ? { lte: range.toDate } : {}),
        },
      }
    : {};

const makeDescription = (...parts) => parts.filter(Boolean).join(' - ') || null;

const mapManualRecord = (item) => ({
  id: `manual-${item.id}`,
  recordId: item.id,
  source: 'manual',
  type: item.type,
  category: item.category,
  description: item.description,
  amount: toAmount(item.amount),
  date: item.date,
  status: item.status,
  createdBy: item.createdBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapTransactionRecord = (item) => ({
  id: `transaction-${item.id}`,
  recordId: item.id,
  source: 'other-transaction',
  type: item.type === 'income' ? 'amdan' : 'kharch',
  category: item.financeHead?.name || (item.type === 'income' ? 'دیگر آمدن' : 'دیگر خرچ'),
  description: makeDescription(item.details, item.slipNo ? `سلپ نمبر: ${item.slipNo}` : null),
  amount: toAmount(item.amount),
  date: item.transactionDate,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapFundRecord = (item) => ({
  id: `fund-${item.id}`,
  recordId: item.id,
  source: 'fund-collection',
  type: 'amdan',
  category: item.donationSubType || item.donationType || 'فنڈ',
  description: makeDescription(item.donorName, item.purpose, item.details, item.receiptNo ? `رسید نمبر: ${item.receiptNo}` : null),
  amount: toAmount(item.amount),
  date: item.paymentDate,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapSalaryRecord = (item) => ({
  id: `salary-${item.id}`,
  recordId: item.id,
  source: 'salary',
  type: 'kharch',
  category: item.financeHead?.name || 'تنخواہ',
  description: makeDescription(item.teacher?.fullName, item.remarks),
  amount: toAmount(item.amount),
  date: item.paymentDate,
  status: item.status,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const mapFeeRecords = (item) => {
  const paidAmount = toAmount(item.paidAmount);
  if (paidAmount <= 0) return [];

  const admissionAmount = Math.min(toAmount(item.admissionFee), paidAmount);
  const feeAmount = Math.max(paidAmount - admissionAmount, 0);
  const base = {
    recordId: item.id,
    source: 'student-fee',
    type: 'amdan',
    date: item.paidDate || item.updatedAt,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  const description = makeDescription(item.student?.fullName, item.voucherNo, item.remarks);

  return [
    ...(admissionAmount > 0
      ? [{ ...base, id: `fee-admission-${item.id}`, category: 'داخلہ فیس', description, amount: admissionAmount }]
      : []),
    ...(feeAmount > 0 ? [{ ...base, id: `fee-monthly-${item.id}`, category: 'فیس', description, amount: feeAmount }] : []),
  ];
};

const matchesSearch = (item, search) => {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [item.category, item.description, String(item.amount)].some((value) => String(value || '').toLowerCase().includes(needle));
};

const applyCommonFilters = (items, query) =>
  items.filter((item) => {
    const typeOk = !query.type || query.type === 'all' || item.type === query.type;
    return typeOk && matchesSearch(item, query.search);
  });

const summarize = (items) => {
  const totalAmdan = items.filter((item) => item.type === 'amdan').reduce((sum, item) => sum + item.amount, 0);
  const totalKharch = items.filter((item) => item.type === 'kharch').reduce((sum, item) => sum + item.amount, 0);
  return {
    totalAmdan,
    totalKharch,
    remainingBalance: totalAmdan - totalKharch,
    totalTransactions: items.length,
  };
};

const fetchFinancialRows = async (tenantId, query) => {
  const resolvedTenantId = normalizeTenantId(tenantId);
  const range = getEffectiveDateRange(query);
  const [manual, transactions, funds, salaries, fees] = await Promise.all([
    prisma.financialRecord.findMany({
      where: { tenantId: resolvedTenantId, status: 'active', ...buildDateWhere('date', range) },
      orderBy: { date: 'desc' },
      select: manualSelect,
    }),
    prisma.financeTransaction.findMany({
      where: { tenantId: resolvedTenantId, status: 'active', ...buildDateWhere('transactionDate', range) },
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        transactionDate: true,
        slipNo: true,
        details: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        financeHead: { select: { id: true, name: true } },
      },
    }),
    prisma.fundCollection.findMany({
      where: { tenantId: resolvedTenantId, status: 'active', ...buildDateWhere('paymentDate', range) },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        donorName: true,
        donationType: true,
        donationSubType: true,
        purpose: true,
        amount: true,
        receiptNo: true,
        details: true,
        paymentDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.salaryEntry.findMany({
      where: { tenantId: resolvedTenantId, status: 'active', teacher: { tenantId: resolvedTenantId }, ...buildDateWhere('paymentDate', range) },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        remarks: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        teacher: { select: { id: true, fullName: true } },
        financeHead: { select: { id: true, name: true } },
      },
    }),
    prisma.studentFeeVoucher.findMany({
      where: {
        tenantId: resolvedTenantId,
        status: { in: ['paid', 'partial'] },
        paidAmount: { gt: 0 },
        student: { tenantId: resolvedTenantId },
        ...buildDateWhere('paidDate', range),
      },
      orderBy: [{ paidDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        voucherNo: true,
        paidAmount: true,
        admissionFee: true,
        paidDate: true,
        remarks: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        student: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return [
    ...manual.map(mapManualRecord),
    ...transactions.map(mapTransactionRecord),
    ...funds.map(mapFundRecord),
    ...salaries.map(mapSalaryRecord),
    ...fees.flatMap(mapFeeRecords),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const financialService = {
  async list(tenantId, query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filteredItems = applyCommonFilters(await fetchFinancialRows(tenantId, query), query);
    const items = filteredItems.slice(skip, skip + limit);

    return {
      items,
      summary: summarize(filteredItems),
      meta: buildPaginationMeta({ totalItems: filteredItems.length, page, limit }),
      filters: {
        fromDate: query.fromDate || null,
        toDate: query.toDate || null,
        type: query.type || 'all',
        duration: query.duration || 'all',
        search: query.search || '',
      },
    };
  },

  async summary(tenantId, query) {
    return summarize(applyCommonFilters(await fetchFinancialRows(tenantId, query), query));
  },

  async create(tenantId, payload, admin) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    return mapManualRecord(
      await prisma.financialRecord.create({
        data: {
          tenantId: resolvedTenantId,
          type: payload.type,
          category: payload.category,
          description: payload.description || null,
          amount: payload.amount,
          date: normalizeStartDate(payload.date),
          status: payload.status || 'active',
          createdById: admin?.id || null,
        },
        select: manualSelect,
      })
    );
  },

  async update(tenantId, id, payload) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await prisma.financialRecord.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!existing) throw new AppError('Financial record not found.', 404);

    return mapManualRecord(
      await prisma.financialRecord.update({
        where: { id },
        data: {
          type: payload.type,
          category: payload.category,
          description: payload.description || null,
          amount: payload.amount,
          date: normalizeStartDate(payload.date),
          status: payload.status || existing.status,
        },
        select: manualSelect,
      })
    );
  },

  async remove(tenantId, id) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const existing = await prisma.financialRecord.findFirst({ where: { id, tenantId: resolvedTenantId } });
    if (!existing) throw new AppError('Financial record not found.', 404);
    return mapManualRecord(await prisma.financialRecord.update({ where: { id }, data: { status: 'inactive' }, select: manualSelect }));
  },
};
