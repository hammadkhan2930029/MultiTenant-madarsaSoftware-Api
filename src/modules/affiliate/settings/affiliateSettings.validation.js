import { z } from 'zod';

const optionalAmountSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : String(value).trim()),
  z.string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Minimum withdrawal amount must be a valid amount with up to 2 decimal places.')
    .refine((value) => Number(value) > 0, 'Minimum withdrawal amount must be greater than zero.')
    .nullable(),
);

export const updateAffiliateSettingsValidationSchema = z.object({
  body: z.object({
    withdrawalIntervalDays: z.coerce.number().int().min(0).max(3650),
    allowBlankWithdrawalAmount: z.boolean(),
    allowOnlyOnePendingRequest: z.boolean(),
    minimumWithdrawalAmount: optionalAmountSchema,
    status: z.enum(['active', 'inactive']),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const getAffiliateSettingsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
