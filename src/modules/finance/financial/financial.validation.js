import { z } from 'zod';

const normalizeType = (value) => {
  if (value === 'income') return 'amdan';
  if (value === 'expense') return 'kharch';
  return value;
};

const typeSchema = z.enum(['all', 'amdan', 'kharch', 'income', 'expense']).transform(normalizeType);
const entryTypeSchema = z.enum(['amdan', 'kharch', 'income', 'expense']).transform(normalizeType);

const financialBodySchema = z.object({
  type: entryTypeSchema,
  category: z.string().trim().min(1).max(150),
  description: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((value) => (value === '' ? undefined : value)),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const listFinancialValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    type: typeSchema.optional(),
    duration: z.enum(['all', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const createFinancialValidationSchema = z.object({
  body: financialBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateFinancialValidationSchema = z.object({
  body: financialBodySchema,
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const financialIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});
