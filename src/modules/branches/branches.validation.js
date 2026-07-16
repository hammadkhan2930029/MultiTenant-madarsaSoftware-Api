import { z } from 'zod';

export const branchStatuses = ['active', 'inactive', 'suspended', 'archived'];
const branchStatusSchema = z.string().trim().refine((value) => branchStatuses.includes(value), {
  message: 'برانچ کی حالت درست منتخب کریں۔',
});

const branchBodySchema = z.object({
  name: z.string({ required_error: 'برانچ کا نام درج کرنا ضروری ہے۔' }).trim().min(2, 'برانچ کا نام درج کرنا ضروری ہے۔').max(150, 'برانچ کا نام بہت لمبا ہے۔'),
  code: z.string({ required_error: 'برانچ کوڈ درج کرنا ضروری ہے۔' }).trim().min(1, 'برانچ کوڈ درج کرنا ضروری ہے۔').max(50, 'برانچ کوڈ بہت لمبا ہے۔'),
  address: z.string().trim().max(255, 'پتہ بہت لمبا ہے۔').optional().or(z.literal('')),
  contact: z.string().trim().max(50, 'رابطہ نمبر بہت لمبا ہے۔').optional().or(z.literal('')),
  status: branchStatusSchema.optional(),
});

const mainBranchSetupSchema = z.object({
  name: z.string().trim().min(2, 'برانچ کا نام درج کرنا ضروری ہے۔').max(150, 'برانچ کا نام بہت لمبا ہے۔').optional(),
  code: z.string().trim().min(1, 'برانچ کوڈ درج کرنا ضروری ہے۔').max(50, 'برانچ کوڈ بہت لمبا ہے۔').optional(),
  address: z.string().trim().max(255, 'پتہ بہت لمبا ہے۔').optional().or(z.literal('')),
  contact: z.string().trim().max(50, 'رابطہ نمبر بہت لمبا ہے۔').optional().or(z.literal('')),
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
    status: branchStatusSchema.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const branchIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('برانچ نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const updateBranchValidationSchema = z.object({
  body: branchBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('برانچ نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const legacyMigrationSummaryValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: mainBranchSetupSchema.default({}),
});

export const legacyMigrationPreviewValidationSchema = legacyMigrationSummaryValidationSchema;

export const legacyMigrationStatusValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const legacyMigrationValidationSchema = z.object({
  body: mainBranchSetupSchema.default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
