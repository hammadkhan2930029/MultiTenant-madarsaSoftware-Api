import { z } from 'zod';

const percentageSchema = z.coerce.number().int().min(0).max(100);

const resultGradeBodySchema = z.object({
  title: z.string().trim().min(1, 'Grade title is required.').max(150, 'Grade title is too long.'),
  code: z.union([z.string().trim().max(20), z.literal(''), z.undefined()]).transform((value) => (value === '' ? undefined : value)),
  from: percentageSchema,
  to: percentageSchema,
  status: z.enum(['active', 'inactive']).optional(),
}).refine((value) => value.from <= value.to, {
  message: 'From percentage must be less than or equal to to percentage.',
  path: ['from'],
});

export const createResultGradeValidationSchema = z.object({
  body: resultGradeBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listResultGradesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const resultGradeIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Result grade id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateResultGradeValidationSchema = z.object({
  body: resultGradeBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Result grade id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
