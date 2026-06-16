import { z } from 'zod';

const performanceStatusSchema = z.string().trim().min(1).max(50);
const optionalText = z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalField = z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalNumber = z.union([z.coerce.number().int().min(0), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));

const bodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  weekLabel: optionalField,
  className: optionalField,
  sectionName: optionalField,
  teacherName: optionalField,
  weekStartDate: z.coerce.date(),
  weekEndDate: z.coerce.date(),
  siparaFrom: optionalField,
  siparaTo: optionalField,
  lessonFrom: optionalField,
  lessonTo: optionalField,
  sawal1: optionalNumber,
  sawal2: optionalNumber,
  sawal3: optionalNumber,
  tahajji: optionalNumber,
  panja: optionalNumber,
  khudKhwani: optionalNumber,
  classWork: optionalField,
  performanceStatus: performanceStatusSchema,
  remarks: optionalText,
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((value, ctx) => {
  if (value.weekEndDate < value.weekStartDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weekEndDate'], message: 'اختتامی تاریخ شروع کی تاریخ کے بعد ہونی چاہیے۔' });
  }
});

export const createWeeklyValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listWeeklyValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive().optional(),
    date: z.coerce.date().optional(),
    performanceStatus: performanceStatusSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const weeklyIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateWeeklyValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
