import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().trim().min(2, 'خرچ کی قسم کا نام لازمی ہے۔').max(150, 'خرچ کی قسم کا نام بہت لمبا ہے۔'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createExpenseCategoryValidationSchema = z.object({
  body: bodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listExpenseCategoriesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const expenseCategoryIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const updateExpenseCategoryValidationSchema = z.object({
  body: bodySchema,
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});
