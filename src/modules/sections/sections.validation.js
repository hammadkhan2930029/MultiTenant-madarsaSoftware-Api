import { z } from 'zod';

const sectionBodySchema = z.object({
  name: z.string().trim().min(1, 'Section name is required.').max(150, 'Section name is too long.'),
  classId: z.coerce.number().int().positive('Class id must be a valid number.'),
});

export const createSectionValidationSchema = z.object({
  body: sectionBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listSectionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const sectionIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Section id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateSectionValidationSchema = z.object({
  body: sectionBodySchema.extend({
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Section id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
