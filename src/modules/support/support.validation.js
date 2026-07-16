import { z } from 'zod';

export const createSupportRequestValidationSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(2, 'Support topic is required.').max(120, 'Support topic is too long.'),
    priority: z.enum(['normal', 'urgent', 'critical']).default('normal'),
    message: z.string().trim().min(5, 'Support message is required.').max(3000, 'Support message is too long.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listSupportRequestsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['open', 'in_progress', 'closed']).optional(),
    priority: z.enum(['normal', 'urgent', 'critical']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
