import { z } from 'zod';

const classBodySchema = z.object({
  name: z.string().trim().min(2, 'Class name is required.').max(150, 'Class name is too long.'),
  branchId: z.coerce.number().int().positive('Branch id must be a valid number.').optional().nullable(),
});

export const createClassValidationSchema = z.object({
  body: classBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const bulkCreateClassesValidationSchema = z.object({
  body: z.object({
    branchId: z.coerce.number().int().positive('Branch id must be a valid number.').optional().nullable(),
    classes: z.array(
      z.object({
        name: z.string().trim().min(2, 'Class name is required.').max(150, 'Class name is too long.'),
      }),
    ).min(1, 'At least one class is required.').max(50, 'Too many classes in one request.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listClassesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const classIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Class id must be a valid number.'),
  }),
  query: z.object({
    branchId: z.coerce.number().int().positive().optional(),
  }).default({}),
});

export const updateClassValidationSchema = z.object({
  body: classBodySchema.extend({
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Class id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
