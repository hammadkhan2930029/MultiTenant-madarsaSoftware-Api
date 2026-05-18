import { z } from 'zod';

const departmentBodySchema = z.object({
  name: z.string().trim().min(2, 'Department name is required.').max(150, 'Department name is too long.'),
  code: z.string().trim().max(50, 'Department code is too long.').optional().or(z.literal('')),
  head: z.string().trim().max(150, 'Department head is too long.').optional().or(z.literal('')),
  members: z.coerce.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createDepartmentValidationSchema = z.object({
  body: departmentBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listDepartmentsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const departmentIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Department id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateDepartmentValidationSchema = z.object({
  body: departmentBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Department id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
