import { prisma } from '../../config/prisma.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildDateRangeFilter = (fromDate, toDate, fieldName) =>
  fromDate || toDate
    ? {
        [fieldName]: {
          ...(fromDate ? { gte: normalizeDate(fromDate) } : {}),
          ...(toDate ? { lte: normalizeDate(toDate) } : {}),
        },
      }
    : {};

const buildStudentAssignmentFilter = (query) =>
  query.branchId || query.classId || query.sectionId || query.sessionId
    ? {
        assignments: {
          some: {
            status: 'active',
            ...(query.branchId ? { branchId: query.branchId } : {}),
            ...(query.classId ? { classId: query.classId } : {}),
            ...(query.sectionId ? { sectionId: query.sectionId } : {}),
            ...(query.sessionId ? { sessionId: query.sessionId } : {}),
          },
        },
      }
    : {};

const studentReportSelect = {
  id: true,
  admissionNumber: true,
  fullName: true,
  fatherName: true,
  gender: true,
  phone: true,
  status: true,
  createdAt: true,
  assignments: {
    where: { status: 'active' },
    take: 1,
    orderBy: { assignedAt: 'desc' },
    select: {
      branch: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
    },
  },
};

export const reportsService = {
  async getStudentsReport(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search } },
              { fatherName: { contains: query.search } },
              { admissionNumber: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...buildStudentAssignmentFilter(query),
    };

    const [items, totalItems] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: studentReportSelect,
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getAttendanceReport(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);

    if (query.type === 'teacher') {
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...buildDateRangeFilter(query.fromDate, query.toDate, 'date'),
      };

      const [items, totalItems] = await Promise.all([
        prisma.teacherAttendance.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            date: true,
            status: true,
            remarks: true,
            teacher: { select: { id: true, fullName: true, phone: true, subject: true } },
            branch: { select: { id: true, name: true, code: true } },
          },
        }),
        prisma.teacherAttendance.count({ where }),
      ]);

      return {
        type: 'teacher',
        items,
        meta: buildPaginationMeta({ totalItems, page, limit }),
      };
    }

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...buildDateRangeFilter(query.fromDate, query.toDate, 'date'),
    };

    const [items, totalItems] = await Promise.all([
      prisma.studentAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          date: true,
          status: true,
          remarks: true,
          student: {
            select: { id: true, admissionNumber: true, fullName: true, fatherName: true },
          },
          branch: { select: { id: true, name: true, code: true } },
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      }),
      prisma.studentAttendance.count({ where }),
    ]);

    return {
      type: 'student',
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getHifzProgressReport(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const studentWhere = {
      ...(query.studentId ? { id: query.studentId } : {}),
      ...buildStudentAssignmentFilter(query),
    };

    const [students, totalItems] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          admissionNumber: true,
          fullName: true,
          assignments: {
            where: { status: 'active' },
            take: 1,
            orderBy: { assignedAt: 'desc' },
            select: {
              branch: { select: { id: true, name: true } },
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
            },
          },
          hifzDailyEntries: {
            ...(query.fromDate || query.toDate
              ? { where: buildDateRangeFilter(query.fromDate, query.toDate, 'date') }
              : {}),
            orderBy: { date: 'desc' },
            take: 1,
            select: { date: true, performanceStatus: true, sabq: true, manzil: true },
          },
          hifzWeeklyEntries: {
            ...(query.fromDate || query.toDate
              ? {
                  where: {
                    AND: [
                      ...(query.fromDate ? [{ weekEndDate: { gte: normalizeDate(query.fromDate) } }] : []),
                      ...(query.toDate ? [{ weekStartDate: { lte: normalizeDate(query.toDate) } }] : []),
                    ],
                  },
                }
              : {}),
            orderBy: { weekStartDate: 'desc' },
            take: 1,
            select: { weekStartDate: true, weekEndDate: true, performanceStatus: true, siparaFrom: true, siparaTo: true },
          },
          hifzMonthlyEntries: {
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 1,
            select: { month: true, year: true, performanceStatus: true, totalRecitation: true },
          },
          hifzSiparaEntries: {
            orderBy: { siparaNumber: 'desc' },
            take: 1,
            select: { siparaNumber: true, performanceStatus: true, totalDays: true, quality: true },
          },
        },
      }),
      prisma.student.count({ where: studentWhere }),
    ]);

    return {
      items: students,
      meta: buildPaginationMeta({ totalItems, page, limit }),
    };
  },

  async getFundCollectionsReport(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMode ? { paymentMode: query.paymentMode } : {}),
      ...(query.donationType ? { donationType: query.donationType } : {}),
      ...(query.donationSubType ? { donationSubType: query.donationSubType } : {}),
      ...(query.search
        ? {
            OR: [
              { donorName: { contains: query.search } },
              { careOf: { contains: query.search } },
              { phone: { contains: query.search } },
              { purpose: { contains: query.search } },
              { receiptNo: { contains: query.search } },
            ],
          }
        : {}),
      ...buildDateRangeFilter(query.fromDate, query.toDate, 'paymentDate'),
    };

    const [items, totalItems] = await Promise.all([
      prisma.fundCollection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        select: {
          id: true,
          collectionGroupId: true,
          donorName: true,
          careOf: true,
          phone: true,
          paymentMode: true,
          donationType: true,
          donationSubType: true,
          purpose: true,
          amount: true,
          receiptNo: true,
          details: true,
          paymentDate: true,
          remarks: true,
          status: true,
        },
      }),
      prisma.fundCollection.count({ where }),
    ]);

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
      summary: { totalAmount },
    };
  },

  async getSalaryReport(query) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const where = {
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.salaryMonth ? { salaryMonth: query.salaryMonth } : {}),
      ...(query.salaryYear ? { salaryYear: query.salaryYear } : {}),
      ...buildDateRangeFilter(query.fromDate, query.toDate, 'paymentDate'),
    };

    const [items, totalItems] = await Promise.all([
      prisma.salaryEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ salaryYear: 'desc' }, { salaryMonth: 'desc' }],
        select: {
          id: true,
          amount: true,
          salaryMonth: true,
          salaryYear: true,
          paymentDate: true,
          remarks: true,
          status: true,
          teacher: { select: { id: true, fullName: true, phone: true, subject: true } },
          financeHead: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.salaryEntry.count({ where }),
    ]);

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      items,
      meta: buildPaginationMeta({ totalItems, page, limit }),
      summary: { totalAmount },
    };
  },

  async getMonthlyFinanceSummaryReport(query) {
    const whereFromDate = query.fromDate ? normalizeDate(query.fromDate) : undefined;
    const whereToDate = query.toDate ? normalizeDate(query.toDate) : undefined;

    const [fundCollections, salaryEntries] = await Promise.all([
      prisma.fundCollection.findMany({
        where: {
          status: 'active',
          ...buildDateRangeFilter(whereFromDate, whereToDate, 'paymentDate'),
        },
        select: { amount: true, paymentDate: true },
      }),
      prisma.salaryEntry.findMany({
        where: {
          status: 'active',
          ...buildDateRangeFilter(whereFromDate, whereToDate, 'paymentDate'),
        },
        select: { amount: true, paymentDate: true },
      }),
    ]);

    const monthlyMap = new Map();

    for (const item of fundCollections) {
      const date = new Date(item.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(key) || { month: key, income: 0, expense: 0 };
      existing.income += Number(item.amount);
      monthlyMap.set(key, existing);
    }

    for (const item of salaryEntries) {
      const date = new Date(item.paymentDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyMap.get(key) || { month: key, income: 0, expense: 0 };
      existing.expense += Number(item.amount);
      monthlyMap.set(key, existing);
    }

    const items = Array.from(monthlyMap.values())
      .map((item) => ({
        ...item,
        netBalance: item.income - item.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const summary = items.reduce(
      (acc, item) => {
        acc.totalIncome += item.income;
        acc.totalExpense += item.expense;
        acc.netBalance += item.netBalance;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, netBalance: 0 }
    );

    return { items, summary };
  },
};
