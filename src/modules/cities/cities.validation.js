import { z } from 'zod';

const cityBodySchema = z.object({
  name: z.string().trim().min(2, 'City name is required.').max(150, 'City name is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createCityValidationSchema = z.object({
  body: cityBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listCitiesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const cityIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('City id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateCityValidationSchema = z.object({
  body: cityBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('City id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
