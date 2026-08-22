import { z } from 'zod';

export const affiliateOverviewListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().max(150).optional(),
  }),
});

export const affiliateOverviewDetailSchema = z.object({
  params: z.object({ tenantId: z.coerce.number().int().positive() }),
});
