import { prisma } from '../../../config/prisma.js';
import { AppError } from '../../../utils/appError.js';

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildDateRangeWhere = (fromDate, toDate, fieldName) =>
  fromDate || toDate
    ? {
        [fieldName]: {
          ...(fromDate ? { gte: normalizeDate(fromDate) } : {}),
          ...(toDate ? { lte: normalizeDate(toDate) } : {}),
        },
      }
    : {};

export const reportsService = {
  async getFinanceSummary(query) {
    const fundWhere = {
      status: 'active',
      ...buildDateRangeWhere(query.fromDate, query.toDate, 'paymentDate'),
    };
    const salaryWhere = {
      status: 'active',
      ...buildDateRangeWhere(query.fromDate, query.toDate, 'paymentDate'),
    };

    const [fundCollections, salaryEntries] = await Promise.all([
      prisma.fundCollection.findMany({ where: fundWhere, select: { amount: true } }),
      prisma.salaryEntry.findMany({ where: salaryWhere, select: { amount: true } }),
    ]);

    const totalIncome = fundCollections.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpense = salaryEntries.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      fromDate: query.fromDate || null,
      toDate: query.toDate || null,
    };
  },

  async getStudentFundHistory(query) {
    const student = await prisma.student.findUnique({
      where: { id: query.studentId },
      select: { id: true, admissionNumber: true, fullName: true },
    });
    if (!student) throw new AppError('Student not found.', 404);

    const entries = await prisma.fundCollection.findMany({
      where: {
        studentId: query.studentId,
        ...buildDateRangeWhere(query.fromDate, query.toDate, 'paymentDate'),
      },
      orderBy: { paymentDate: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        remarks: true,
        status: true,
        financeHead: { select: { id: true, name: true, type: true } },
      },
    });

    return {
      student,
      history: entries,
    };
  },

  async getTeacherSalaryHistory(query) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: query.teacherId },
      select: { id: true, fullName: true, subject: true, phone: true },
    });
    if (!teacher) throw new AppError('Teacher not found.', 404);

    const entries = await prisma.salaryEntry.findMany({
      where: {
        teacherId: query.teacherId,
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
