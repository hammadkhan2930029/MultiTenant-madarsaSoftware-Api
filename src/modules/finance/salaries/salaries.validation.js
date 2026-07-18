import { z } from 'zod';

const bodySchema = z.object({
  teacherId: z.coerce.number().int().positive(),
  financeHeadId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive('Amount must be positive.'),
  salaryMonth: z.coerce.number().int().min(1).max(12),
  salaryYear: z.coerce.number().int().min(2000).max(3000),
  paymentDate: z.coerce.date({ message: 'Payment date is required.' }),
  remarks: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createSalaryValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listSalariesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    teacherId: z.coerce.number().int().positive().optional(),
    salaryMonth: z.coerce.number().int().min(1).max(12).optional(),
    salaryYear: z.coerce.number().int().min(2000).max(3000).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    staffType: z.enum(['teacher', 'staff']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const salaryIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateSalaryValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
