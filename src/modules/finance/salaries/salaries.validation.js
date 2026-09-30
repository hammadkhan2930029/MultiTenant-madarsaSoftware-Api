import { z } from 'zod';

const bodySchema = z.object({
  branchId: z.coerce.number().int().positive().optional().nullable(),
  teacherId: z.coerce.number().int().positive(),
  financeHeadId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive('Amount must be positive.'),
  salaryMonth: z.coerce.number().int().min(1).max(12),
  salaryYear: z.coerce.number().int().min(2000).max(3000),
  paymentDate: z.coerce.date({ message: 'Payment date is required.' }),
  paymentMethod: z.enum(['Cash', 'Online', 'Cheque', 'Bank Transfer']).optional(),
  chequeBankName: z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  chequeBranchCode: z.union([z.string().trim().max(50), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  chequeNumber: z.union([z.string().trim().max(100), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  chequeDate: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : v), z.coerce.date().optional()),
  onlineWalletOrBank: z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  onlineReferenceNo: z.union([z.string().trim().max(100), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  remarks: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'Cheque' && !data.chequeDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['chequeDate'], message: 'Cheque date is required.' });
  }
  if (data.paymentMethod === 'Online' && !data.onlineReferenceNo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['onlineReferenceNo'], message: 'Online reference number is required.' });
  }
});

export const createSalaryValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listSalariesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    teacherId: z.coerce.number().int().positive().optional(),
    salaryMonth: z.coerce.number().int().min(1).max(12).optional(),
    salaryYear: z.coerce.number().int().min(2000).max(3000).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    staffType: z.enum(['teacher', 'staff']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const listSalaryTeachersValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    staffType: z.enum(['teacher', 'staff']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const salaryIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateSalaryValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
