import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';
import { branchScopeService } from '../../security/index.js';

const DEFAULT_FEE_VOUCHER_NUMBER = 'FEE-0001';

const voucherSelect = {
  id: true,
  tenantId: true,
  voucherNo: true,
  feeMonth: true,
  feeYear: true,
  monthlyFee: true,
  admissionFee: true,
  arrears: true,
  discount: true,
  fine: true,
  totalAmount: true,
  paidAmount: true,
  dueAmount: true,
  dueDate: true,
  paidDate: true,
  paymentMethod: true,
  remarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      tenantId: true,
      admissionNumber: true,
      fullName: true,
      fatherName: true,
      phone: true,
      monthlyFee: true,
      admissionFee: true,
      assignments: {
        where: { status: 'active' },
        take: 1,
        orderBy: { assignedAt: 'desc' },
        select: {
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          session: { select: { id: true, name: true } },
        },
      },
    },
  },
};

const normalizeTenantId = (tenantId) => {
  const resolvedTenantId = Number(tenantId);

  if (!Number.isInteger(resolvedTenantId) || resolvedTenantId <= 0) {
    throw new AppError('Tenant context is required.', 403);
  }

  return resolvedTenantId;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toAmount = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const makeVoucherNo = ({ studentId, feeMonth, feeYear }) =>
  `FEE-${feeYear}${String(feeMonth).padStart(2, '0')}-${String(studentId).padStart(5, '0')}`;

const parseSequencedNumber = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^(.*?)(\d+)$/);

  if (!match) return null;

  return {
    prefix: match[1],
    number: Number(match[2]),
    width: match[2].length,
  };
};

const formatSequencedNumber = ({ prefix, number, width }) => `${prefix}${String(number).padStart(width, '0')}`;

const getNextSequencedNumber = (seed, existingNumbers = []) => {
  const parsedSeed = parseSequencedNumber(seed) || parseSequencedNumber(DEFAULT_FEE_VOUCHER_NUMBER);

  const highestMatchingNumber = existingNumbers
    .map(parseSequencedNumber)
    .filter((item) => item && item.prefix === parsedSeed.prefix)
    .reduce((highest, item) => {
      if (!highest || item.number > highest.number) return item;
      return highest;
    }, null);

  if (!highestMatchingNumber) return formatSequencedNumber(parsedSeed);

  return formatSequencedNumber({
    ...highestMatchingNumber,
    number: highestMatchingNumber.number + 1,
  });
};

const incrementSequencedNumber = (value) => {
  const parsed = parseSequencedNumber(value) || parseSequencedNumber(DEFAULT_FEE_VOUCHER_NUMBER);
  return formatSequencedNumber({ ...parsed, number: parsed.number + 1 });
};

const isMissingFeeVoucherColumnError = (error) => {
  const message = String(error?.message || '');
  return error?.code === 'P2010' || message.includes('feeVoucherNoSeq') || message.includes('Unknown column');
};

const getTenantFeeVoucherSeed = async (tenantId) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT feeVoucherNoSeq
      FROM madrassa_profiles
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `;
    return rows?.[0]?.feeVoucherNoSeq || DEFAULT_FEE_VOUCHER_NUMBER;
  } catch (error) {
    if (isMissingFeeVoucherColumnError(error)) return null;
    throw error;
  }
};

const getFeePeriodIndex = ({ feeMonth, feeYear }) => (Number(feeYear) * 12) + Number(feeMonth);

const getAdmissionPeriodIndex = (admissionDate) => {
  if (!admissionDate) return null;
  const date = new Date(admissionDate);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getFullYear() * 12) + date.getMonth() + 1;
};

const isBeforeAdmissionPeriod = ({ feeMonth, feeYear, admissionDate }) => {
  const admissionPeriod = getAdmissionPeriodIndex(admissionDate);
  if (!admissionPeriod) return false;
  return getFeePeriodIndex({ feeMonth, feeYear }) < admissionPeriod;
};

const getFeePeriodEndDate = ({ feeMonth, feeYear }) => {
  if (!feeMonth || !feeYear) return null;
  const date = new Date(Number(feeYear), Number(feeMonth), 0, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getScopedBranchId = (branchScope) => branchScope?.branchId || branchScope?.resolvedBranchId || null;

const resolveBranchId = async (tenantId, payloadOrQuery = {}, branchScope = null) => {
  const branchId = getScopedBranchId(branchScope) || payloadOrQuery.branchId || null;
  if (branchId) {
    await branchScopeService.validateBranchBelongsToTenant({
      tenantId,
      branchId,
      requireActive: true,
    });
  }
  return branchId;
};

const buildStudentBranchVisibilityWhere = (tenantId, branchId) => {
  if (!branchId) return {};

  return {
    OR: [
      { branchId },
      {
        assignments: {
          some: {
            tenantId,
            branchId,
            status: 'active',
          },
        },
      },
    ],
  };
};

const buildAssignmentFilter = ({ tenantId, branchId, classId, sectionId, sessionId }) => {
  if (!branchId && !classId && !sectionId && !sessionId) return {};

  return {
    assignments: {
      some: {
        ...(tenantId ? { tenantId } : {}),
        status: 'active',
        ...(branchId ? { branchId } : {}),
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
    },
  };
};

const buildSearchFilter = (search) => {
  if (!search) return {};

  return {
    OR: [
      { fullName: { contains: search } },
      { fatherName: { contains: search } },
      { admissionNumber: { contains: search } },
      { phone: { contains: search } },
    ],
  };
};

export const studentFeesService = {
  async generateFees(tenantId, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = await resolveBranchId(resolvedTenantId, payload, branchScope);

    const {
      feeMonth,
      feeYear,
      classId,
      sectionId,
      sessionId,
      dueDate,
      includeAdmissionFee = false,
      overwrite = false,
    } = payload;

    const students = await prisma.student.findMany({
      where: {
        tenantId: resolvedTenantId,
        status: 'active',
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...buildAssignmentFilter({ tenantId: resolvedTenantId, branchId: scopedBranchId, classId, sectionId, sessionId }),
      },
      select: {
        id: true,
        admissionDate: true,
        monthlyFee: true,
        admissionFee: true,
      },
      orderBy: { id: 'asc' },
    });

    if (!students.length) {
      return { generated: 0, skipped: 0, items: [] };
    }

    const [existingVouchers, allVoucherNumbers, feeVoucherSeed] = await Promise.all([
      prisma.studentFeeVoucher.findMany({
        where: {
          tenantId: resolvedTenantId,
          feeMonth,
          feeYear,
          studentId: { in: students.map((student) => student.id) },
        },
        select: { id: true, studentId: true, status: true, voucherNo: true },
      }),
      prisma.studentFeeVoucher.findMany({
        where: { tenantId: resolvedTenantId },
        select: { voucherNo: true },
      }),
      getTenantFeeVoucherSeed(resolvedTenantId),
    ]);
    const existingByStudentId = new Map(existingVouchers.map((item) => [item.studentId, item]));
    let nextVoucherNo = getNextSequencedNumber(
      feeVoucherSeed || DEFAULT_FEE_VOUCHER_NUMBER,
      allVoucherNumbers.map((voucher) => voucher.voucherNo)
    );

    const getVoucherNo = () => {
      const voucherNo = nextVoucherNo;
      nextVoucherNo = incrementSequencedNumber(nextVoucherNo);
      return voucherNo;
    };

    let generated = 0;
    let skipped = 0;
    const items = [];

    for (const student of students) {
      if (isBeforeAdmissionPeriod({ feeMonth, feeYear, admissionDate: student.admissionDate })) {
        skipped += 1;
        continue;
      }

      const existing = existingByStudentId.get(student.id);
      if (existing && (!overwrite || existing.status === 'paid' || existing.status === 'partial')) {
        skipped += 1;
        continue;
      }

      const monthlyFee = toAmount(student.monthlyFee);
      const admissionFee = includeAdmissionFee ? toAmount(student.admissionFee) : 0;
      const totalAmount = monthlyFee + admissionFee;

      if (totalAmount <= 0) {
        skipped += 1;
        continue;
      }

      const data = {
        voucherNo: existing?.voucherNo || (feeVoucherSeed ? getVoucherNo() : makeVoucherNo({ studentId: student.id, feeMonth, feeYear })),
        tenantId: resolvedTenantId,
        studentId: student.id,
        feeMonth,
        feeYear,
        monthlyFee,
        admissionFee,
        arrears: 0,
        discount: 0,
        fine: 0,
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        dueDate: normalizeDate(dueDate),
        paidDate: null,
        paymentMethod: null,
        remarks: null,
        status: 'unpaid',
      };

      const voucher = existing
        ? await prisma.studentFeeVoucher.update({ where: { id: existing.id, tenantId: resolvedTenantId }, data, select: voucherSelect })
        : await prisma.studentFeeVoucher.create({ data, select: voucherSelect });

      generated += 1;
      items.push(voucher);
    }

    return { generated, skipped, items };
  },

  async getFees(tenantId, query, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const scopedBranchId = await resolveBranchId(resolvedTenantId, query, branchScope);
    const feePeriodEndDate = getFeePeriodEndDate({ feeMonth: query.feeMonth, feeYear: query.feeYear });
    const where = {
      tenantId: resolvedTenantId,
      ...(query.feeMonth ? { feeMonth: query.feeMonth } : {}),
      ...(query.feeYear ? { feeYear: query.feeYear } : {}),
      ...(query.status ? { status: query.status } : {}),
      student: {
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
        ...(feePeriodEndDate ? { AND: [{ OR: [{ admissionDate: null }, { admissionDate: { lte: feePeriodEndDate } }] }] } : {}),
        ...buildSearchFilter(query.search),
        ...buildAssignmentFilter({
          tenantId: resolvedTenantId,
          branchId: scopedBranchId,
          classId: query.classId,
          sectionId: query.sectionId,
          sessionId: query.sessionId,
        }),
      },
    };

    const [items, totalItems] = await Promise.all([
      prisma.studentFeeVoucher.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ feeYear: 'desc' }, { feeMonth: 'desc' }, { id: 'desc' }],
        select: voucherSelect,
      }),
      prisma.studentFeeVoucher.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta({ totalItems, page, limit }) };
  },

  async getFeeById(tenantId, id, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const voucher = await prisma.studentFeeVoucher.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...(scopedBranchId ? { student: buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId) } : {}),
      },
      select: voucherSelect,
    });
    if (!voucher) throw new AppError('Fee voucher not found.', 404);
    return voucher;
  },

  async getStudentFeeHistory(tenantId, studentId, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        tenantId: resolvedTenantId,
        ...buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId),
      },
      select: {
        id: true,
        admissionNumber: true,
        fullName: true,
        fatherName: true,
        phone: true,
        monthlyFee: true,
        assignments: {
          where: { status: 'active' },
          take: 1,
          orderBy: { assignedAt: 'desc' },
          select: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            session: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student) throw new AppError('Student not found.', 404);

    const vouchers = await prisma.studentFeeVoucher.findMany({
      where: { studentId, tenantId: resolvedTenantId },
      orderBy: [{ feeYear: 'desc' }, { feeMonth: 'desc' }],
      select: voucherSelect,
    });

    return { student, vouchers };
  },

  async savePayment(tenantId, id, payload, branchScope = null) {
    const resolvedTenantId = normalizeTenantId(tenantId);
    const scopedBranchId = getScopedBranchId(branchScope);
    const existing = await prisma.studentFeeVoucher.findFirst({
      where: {
        id,
        tenantId: resolvedTenantId,
        ...(scopedBranchId ? { student: buildStudentBranchVisibilityWhere(resolvedTenantId, scopedBranchId) } : {}),
      },
    });
    if (!existing) throw new AppError('Fee voucher not found.', 404);

    const totalAmount = toAmount(existing.totalAmount);
    const paidAmount = Math.min(toAmount(payload.paidAmount), totalAmount);
    const dueAmount = Math.max(totalAmount - paidAmount, 0);
    const status = dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    return prisma.studentFeeVoucher.update({
      where: { id, tenantId: resolvedTenantId },
      data: {
        paidAmount,
        dueAmount,
        paidDate: paidAmount > 0 ? normalizeDate(payload.paidDate || new Date()) : null,
        paymentMethod: paidAmount > 0 ? payload.paymentMethod || 'Cash' : null,
        remarks: payload.remarks || null,
        status,
      },
      select: voucherSelect,
    });
  },
};
