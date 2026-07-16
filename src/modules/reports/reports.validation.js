import { z } from 'zod';

const reportStatusSchema = z.enum(['active', 'inactive']);
const attendanceStatusSchema = z.enum(['Present', 'Absent', 'Leave', 'Late']);

const baseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  classId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  sessionId: z.coerce.number().int().positive().optional(),
});

const withDateRangeValidation = (schema) =>
  schema.superRefine((value, ctx) => {
    if (value.query.fromDate && value.query.toDate && value.query.toDate < value.query.fromDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['query', 'toDate'],
        message: 'To date must be greater than or equal to from date.',
      });
    }
  });

export const studentsReportValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: baseQuerySchema.extend({
      search: z.string().trim().optional(),
      status: reportStatusSchema.optional(),
    }),
  })
);

export const attendanceReportValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: baseQuerySchema.extend({
      type: z.enum(['student', 'teacher']).optional(),
      status: attendanceStatusSchema.optional(),
    }),
  })
);

export const hifzProgressReportValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: baseQuerySchema.extend({
      studentId: z.coerce.number().int().positive().optional(),
    }),
  })
);

export const fundCollectionsReportValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: baseQuerySchema.extend({
      paymentMode: z.enum(['نقد', 'چیک', 'آن لائن']).optional(),
      donationType: z.enum(['صدقات واجبہ', 'صدقات نافلہ']).optional(),
      donationSubType: z.string().trim().optional(),
      search: z.string().trim().optional(),
      status: reportStatusSchema.optional(),
    }),
  })
);

export const salaryReportValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: baseQuerySchema.extend({
      teacherId: z.coerce.number().int().positive().optional(),
      salaryMonth: z.coerce.number().int().min(1).max(12).optional(),
      salaryYear: z.coerce.number().int().min(2000).max(3000).optional(),
      status: reportStatusSchema.optional(),
    }),
  })
);

export const monthlyFinanceSummaryValidationSchema = withDateRangeValidation(
  z.object({
    body: z.object({}).default({}),
    params: z.object({}).default({}),
    query: z.object({
      fromDate: z.coerce.date().optional(),
      toDate: z.coerce.date().optional(),
      branchId: z.coerce.number().int().positive().optional(),
    }),
  })
);
