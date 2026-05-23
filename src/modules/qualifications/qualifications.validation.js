import { z } from 'zod';

const qualificationBodySchema = z.object({
  title: z.string().trim().min(2, 'Qualification title is required.').max(150, 'Qualification title is too long.'),
  category: z.string().trim().max(150, 'Qualification category is too long.').optional().or(z.literal('')),
  level: z.string().trim().max(150, 'Qualification level is too long.').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createQualificationValidationSchema = z.object({
  body: qualificationBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listQualificationsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const qualificationIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Qualification id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateQualificationValidationSchema = z.object({
  body: qualificationBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Qualification id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
