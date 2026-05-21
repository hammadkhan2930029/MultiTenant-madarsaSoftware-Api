import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';
import { buildPaginationMeta, getPagination } from '../../../utils/pagination.js';

const voucherSelect = {
  id: true,
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

const buildAssignmentFilter = ({ classId, sectionId, sessionId }) => {
  if (!classId && !sectionId && !sessionId) return {};

  return {
    assignments: {
      some: {
        status: 'active',
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
  async generateFees(payload) {
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
        status: 'active',
        ...buildAssignmentFilter({ classId, sectionId, sessionId }),
      },
      select: {
        id: true,
        monthlyFee: true,
        admissionFee: true,
      },
      orderBy: { id: 'asc' },
    });

    if (!students.length) {
      return { generated: 0, skipped: 0, items: [] };
    }

    const existingVouchers = await prisma.studentFeeVoucher.findMany({
      where: {
        feeMonth,
        feeYear,
        studentId: { in: students.map((student) => student.id) },
      },
      select: { id: true, studentId: true, status: true },
    });
    const existingByStudentId = new Map(existingVouchers.map((item) => [item.studentId, item]));

    let generated = 0;
    let skipped = 0;
    const items = [];

    for (const student of students) {
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
        voucherNo: makeVoucherNo({ studentId: student.id, feeMonth, feeYear }),
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
        ? await prisma.studentFeeVoucher.update({ where: { id: existing.id }, data, select: voucherSelect })
        : await prisma.studentFeeVoucher.create({ data, select: voucherSelect });

      generated += 1;
      items.push(voucher);
    }

    return { generated, skipped, items };
  },

  async getFees(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.feeMonth ? { feeMonth: query.feeMonth } : {}),
      ...(query.feeYear ? { feeYear: query.feeYear } : {}),
      ...(query.status ? { status: query.status } : {}),
      student: {
        ...buildSearchFilter(query.search),
        ...buildAssignmentFilter({
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

  async getFeeById(id) {
    const voucher = await prisma.studentFeeVoucher.findUnique({ where: { id }, select: voucherSelect });
    if (!voucher) throw new AppError('Fee voucher not found.', 404);
    return voucher;
  },

  async getStudentFeeHistory(studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
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
      where: { studentId },
      orderBy: [{ feeYear: 'desc' }, { feeMonth: 'desc' }],
      select: voucherSelect,
    });

    return { student, vouchers };
  },

  async savePayment(id, payload) {
    const existing = await prisma.studentFeeVoucher.findUnique({ where: { id } });
    if (!existing) throw new AppError('Fee voucher not found.', 404);

    const totalAmount = toAmount(existing.totalAmount);
    const paidAmount = Math.min(toAmount(payload.paidAmount), totalAmount);
    const dueAmount = Math.max(totalAmount - paidAmount, 0);
    const status = dueAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';

    return prisma.studentFeeVoucher.update({
      where: { id },
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
