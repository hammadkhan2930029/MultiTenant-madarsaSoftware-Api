import { z } from 'zod';

const bodySchema = z.object({
  financeHeadId: z.coerce.number().int().positive('مالیاتی مد منتخب کریں۔'),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('رقم صفر سے زیادہ ہونی چاہیے۔'),
  transactionDate: z.coerce.date({ message: 'تاریخ ضروری ہے۔' }),
  paymentMode: z.union([z.enum(['نقد', 'آن لائن', 'چیک']), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  paymentStatus: z.union([z.enum(['مکمل', 'جزوی']), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  slipNo: z.union([z.string().trim().max(100), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  details: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((value, ctx) => {
  if (value.type === 'expense' && !value.paymentMode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentMode'], message: 'خرچ کے لیے ادائیگی کا طریقہ ضروری ہے۔' });
  }
  if (value.type === 'expense' && !value.paymentStatus) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentStatus'], message: 'خرچ کے لیے ادائیگی کی حالت ضروری ہے۔' });
  }
});

export const createTransactionValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });

export const listTransactionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    financeHeadId: z.coerce.number().int().positive().optional(),
    type: z.enum(['income', 'expense']).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const transactionIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateTransactionValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
