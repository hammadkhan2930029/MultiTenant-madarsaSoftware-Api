import { z } from 'zod';

const subjectBodySchema = z.object({
  name: z.string().trim().min(2, 'Subject name is required.').max(150, 'Subject name is too long.'),
  detail: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((value) => (value === '' ? undefined : value)),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createSubjectValidationSchema = z.object({
  body: subjectBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listSubjectsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const subjectIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Subject id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateSubjectValidationSchema = z.object({
  body: subjectBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Subject id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
