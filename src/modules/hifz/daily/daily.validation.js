import { z } from 'zod';

const performanceStatusSchema = z.string().trim().min(1).max(50);
const optionalText = z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalField = z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));
const optionalNumber = z.union([z.coerce.number().int().min(0), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v));

const bodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  date: z.coerce.date(),
  sabq: optionalField,
  sabqListener: optionalField,
  sabqRuku: optionalField,
  sabqAyatFrom: optionalField,
  sabqAyatTo: optionalField,
  sabqTeacherName: optionalField,
  sabqMistake: optionalNumber,
  sabqAtkann: optionalNumber,
  sabaqi: optionalField,
  sabaqiRuku: optionalField,
  sabaqiAyatFrom: optionalField,
  sabaqiAyatTo: optionalField,
  sabaqiMistake: optionalNumber,
  sabaqiAtkann: optionalNumber,
  manzil: optionalField,
  manzilBeforeDetail: optionalField,
  manzilBeforePara: optionalField,
  manzilBeforeRuku: optionalField,
  manzilBeforeAyatFrom: optionalField,
  manzilBeforeAyatTo: optionalField,
  manzilBeforeMistake: optionalNumber,
  manzilBeforeAtkann: optionalNumber,
  manzilAfterDetail: optionalField,
  manzilAfterPara: optionalField,
  manzilAfterRuku: optionalField,
  manzilAfterAyatFrom: optionalField,
  manzilAfterAyatTo: optionalField,
  manzilAfterMistake: optionalNumber,
  manzilAfterAtkann: optionalNumber,
  lessonDetail: optionalText,
  count: optionalNumber,
  performanceStatus: performanceStatusSchema,
  remarks: optionalText,
  status: z.enum(['active', 'inactive']).optional(),
});

export const createDailyValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listDailyValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    date: z.coerce.date().optional(),
    performanceStatus: performanceStatusSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const dailyIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateDailyValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
