import { z } from 'zod';

const percentageSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? value : String(value).trim()),
  z.string()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, 'Percentage must be a valid number with up to 2 decimal places.')
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, 'Percentage must be between 0 and 100.'),
);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format.');
const optionalEndDateSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  dateSchema.nullable(),
);

const tierBodySchema = z.object({
  minReferrals: z.coerce.number().int().min(1, 'Minimum referrals must be at least 1.'),
  maxReferrals: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : value),
    z.coerce.number().int().min(1).nullable(),
  ),
  percentage: percentageSchema,
  effectiveFrom: dateSchema,
  effectiveTo: optionalEndDateSchema,
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((value, context) => {
  if (value.maxReferrals !== null && value.maxReferrals < value.minReferrals) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxReferrals'],
      message: 'Maximum referrals cannot be less than minimum referrals.',
    });
  }

  if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effectiveTo'],
      message: 'Effective-to date cannot be before effective-from date.',
    });
  }
});

export const createCommissionTierValidationSchema = z.object({
  body: tierBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateCommissionTierValidationSchema = z.object({
  body: tierBodySchema,
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const updateCommissionTierStatusValidationSchema = z.object({
  body: z.object({ status: z.enum(['active', 'inactive']) }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const commissionTierIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const listCommissionTiersValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }).default({}),
});
