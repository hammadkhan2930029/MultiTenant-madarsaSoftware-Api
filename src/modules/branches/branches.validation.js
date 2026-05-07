import { z } from 'zod';

const branchBodySchema = z.object({
  name: z.string().trim().min(2, 'Branch name is required.').max(150, 'Branch name is too long.'),
  code: z.string().trim().max(50, 'Branch code is too long.').optional().or(z.literal('')),
  address: z.string().trim().max(255, 'Address is too long.').optional().or(z.literal('')),
});

export const createBranchValidationSchema = z.object({
  body: branchBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listBranchesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const branchIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Branch id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateBranchValidationSchema = z.object({
  body: branchBodySchema.extend({
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Branch id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
