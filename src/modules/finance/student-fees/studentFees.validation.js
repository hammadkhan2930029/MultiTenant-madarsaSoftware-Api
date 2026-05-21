import { z } from 'zod';

const optionalText = z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((value) => (value === '' ? undefined : value));

export const generateStudentFeesValidationSchema = z.object({
  body: z.object({
    feeMonth: z.coerce.number().int().min(1).max(12),
    feeYear: z.coerce.number().int().min(2000).max(3000),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    dueDate: z.coerce.date().optional(),
    includeAdmissionFee: z.coerce.boolean().optional(),
    overwrite: z.coerce.boolean().optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listStudentFeesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    feeMonth: z.coerce.number().int().min(1).max(12).optional(),
    feeYear: z.coerce.number().int().min(2000).max(3000).optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    status: z.enum(['unpaid', 'partial', 'paid', 'cancelled']).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  }),
});

export const studentFeeIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const studentFeeHistoryValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({ studentId: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});

export const saveStudentFeePaymentValidationSchema = z.object({
  body: z.object({
    paidAmount: z.coerce.number().min(0),
    paidDate: z.coerce.date().optional(),
    paymentMethod: z.enum(['Cash', 'Online', 'Cheque', 'Bank Transfer']).optional(),
    remarks: optionalText,
  }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({}).default({}),
});
