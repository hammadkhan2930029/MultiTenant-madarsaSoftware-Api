import { z } from 'zod';

export const listAuditLogsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    tenantId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
    roleId: z.coerce.number().int().positive().optional(),
    module: z.string().trim().max(100).optional(),
    action: z.string().trim().max(100).optional(),
    search: z.string().trim().max(150).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
