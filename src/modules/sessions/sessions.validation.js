import { z } from 'zod';

const sessionBodyBaseSchema = z.object({
  name: z.string().trim().min(2, 'Session name is required.').max(150, 'Session name is too long.'),
  startDate: z.coerce.date({ message: 'Start date is required.' }),
  endDate: z.coerce.date({ message: 'End date is required.' }),
});

const withSessionDateValidation = (schema) =>
  schema.superRefine((value, ctx) => {
    if (value.endDate <= value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be greater than start date.',
      });
    }
  });

const sessionBodySchema = withSessionDateValidation(sessionBodyBaseSchema);

export const createSessionValidationSchema = z.object({
  body: sessionBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listSessionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const sessionIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Session id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateSessionValidationSchema = z.object({
  body: withSessionDateValidation(
    sessionBodyBaseSchema.extend({
      status: z.enum(['active', 'inactive']).optional(),
    }),
  ),
  params: z.object({
    id: z.coerce.number().int().positive('Session id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
