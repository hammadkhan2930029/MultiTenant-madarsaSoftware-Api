import { z } from 'zod';

export const financeSummaryReportValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    branchId: z.coerce.number().int().positive().optional(),
  }),
});

export const studentFundHistoryValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive(),
    branchId: z.coerce.number().int().positive().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
});

export const teacherSalaryHistoryValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    teacherId: z.coerce.number().int().positive(),
    branchId: z.coerce.number().int().positive().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
});
