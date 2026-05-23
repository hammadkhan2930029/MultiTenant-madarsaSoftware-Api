import { z } from 'zod';

const contactNumberSchema = z
  .string()
  .trim()
  .min(1, 'رابطہ نمبر ضروری ہے۔')
  .max(13, 'رابطہ نمبر بہت لمبا ہے۔')
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => /^(03\d{9}|\+923\d{9}|923\d{9})$/.test(value), 'درست رابطہ نمبر درج کریں، مثلاً 03001234567۔');

const bodySchema = z.object({
  collectionGroupId: z.string().trim().min(1, 'رسید ٹریکنگ نمبر ضروری ہے۔').max(100, 'رسید ٹریکنگ نمبر بہت لمبا ہے۔'),
  donorName: z.string().trim().min(1, 'نام دہندہ ضروری ہے۔').max(150, 'نام دہندہ بہت لمبا ہے۔'),
  careOf: z.union([z.string().trim().max(150), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  phone: contactNumberSchema,
  paymentMode: z.enum(['نقد', 'چیک', 'آن لائن'], { message: 'ادائیگی کا درست طریقہ منتخب کریں۔' }),
  donationType: z.enum(['صدقات واجبہ', 'صدقات نافلہ'], { message: 'عطیہ کی درست قسم منتخب کریں۔' }),
  donationSubType: z.string().trim().min(1, 'عطیہ کی ذیلی قسم ضروری ہے۔').max(100, 'عطیہ کی ذیلی قسم بہت لمبی ہے۔'),
  purpose: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  amount: z.coerce.number().positive('رقم صفر سے زیادہ ہونی چاہیے۔'),
  receiptNo: z.union([z.string().trim().max(100), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  details: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  paymentDate: z.coerce.date({ message: 'ادائیگی کی تاریخ ضروری ہے۔' }),
  remarks: z.union([z.string().trim().max(255), z.literal(''), z.undefined()]).transform((v) => (v === '' ? undefined : v)),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createFundCollectionValidationSchema = z.object({ body: bodySchema, params: z.object({}).default({}), query: z.object({}).default({}) });
export const listFundCollectionsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    paymentMode: z.enum(['نقد', 'چیک', 'آن لائن']).optional(),
    donationType: z.enum(['صدقات واجبہ', 'صدقات نافلہ']).optional(),
    donationSubType: z.string().trim().optional(),
    phone: z.string().trim().transform((value) => value.replace(/[\s-]/g, '')).optional(),
    collectionGroupId: z.string().trim().optional(),
    search: z.string().trim().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
export const fundCollectionIdValidationSchema = z.object({ body: z.object({}).default({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
export const updateFundCollectionValidationSchema = z.object({ body: bodySchema, params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}).default({}) });
