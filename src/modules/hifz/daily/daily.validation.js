import { z } from 'zod';

const statusEnum = z.enum(['Excellent', 'Good', 'Average', 'Weak']);
const optionalText = z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalField = z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));

const bodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  sabq: optionalField,
  sabaqi: optionalField,
  manzil: optionalField,
  performanceStatus: statusEnum,
  remarks: optionalText,
  status: z.enum(['active', 'inactive']).optional(),
});

export const createDailyValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listDailyValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive().optional(),
    date: z.coerce.date().optional(),
    performanceStatus: statusEnum.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const dailyIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateDailyValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
