import { z } from 'zod';

const performanceStatusSchema = z.string().trim().min(1).max(50);
const optionalText = z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalField = z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const bodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  siparaNumber: z.coerce.number().int().min(1).max(30),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  totalDays: z.coerce.number().int().positive().optional(),
  quality: optionalField,
  performanceStatus: performanceStatusSchema,
  remarks: optionalText,
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((value, ctx) => {
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'End date must be after start date.' });
  }
});

export const createSiparaValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listSiparaValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    siparaNumber: z.coerce.number().int().min(1).max(30).optional(),
    date: z.coerce.date().optional(),
    performanceStatus: performanceStatusSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const siparaIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateSiparaValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
