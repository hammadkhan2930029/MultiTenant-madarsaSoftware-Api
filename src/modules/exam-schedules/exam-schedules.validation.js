import { z } from 'zod';

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const examScheduleBodySchema = z.object({
  examName: z.string().trim().min(1, 'امتحان کا نام لازمی ہے۔').max(150, 'امتحان کا نام بہت لمبا ہے۔'),
  sessionId: z.coerce.number().int().positive('درست سیشن منتخب کریں۔'),
  classId: z.coerce.number().int().positive('درست کلاس منتخب کریں۔'),
  sectionId: z.coerce.number().int().positive('درست جماعت سیکشن منتخب کریں۔'),
  subjectId: z.coerce.number().int().positive('درست مضمون منتخب کریں۔'),
  examDate: z.coerce.date({ required_error: 'تاریخ لازمی ہے۔' }),
  startTime: z.string().trim().min(1, 'شروع وقت لازمی ہے۔').max(10, 'شروع وقت بہت لمبا ہے۔'),
  endTime: z.string().trim().min(1, 'اختتام وقت لازمی ہے۔').max(10, 'اختتام وقت بہت لمبا ہے۔'),
  totalMarks: z.preprocess(emptyToUndefined, z.coerce.number().int().positive('کل نمبر لازمی اور درست ہونے چاہئیں۔')),
  room: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  invigilator: z.preprocess(emptyToUndefined, z.string().trim().max(150).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createExamScheduleValidationSchema = z.object({
  body: examScheduleBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateExamScheduleValidationSchema = z.object({
  body: examScheduleBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('درست امتحانی نظام الاوقات منتخب کریں۔'),
  }),
  query: z.object({}).default({}),
});

export const listExamSchedulesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const examScheduleIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('درست امتحانی نظام الاوقات منتخب کریں۔'),
  }),
  query: z.object({}).default({}),
});
