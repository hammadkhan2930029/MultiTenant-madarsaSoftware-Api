import { z } from 'zod';

const bodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  financeHeadId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive('Amount must be positive.'),
  paymentDate: z.coerce.date({ message: 'Payment date is required.' }),
  remarks: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createFundCollectionValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listFundCollectionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    studentId: z.coerce.number().int().positive().optional(),
    financeHeadId: z.coerce.number().int().positive().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const fundCollectionIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateFundCollectionValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
