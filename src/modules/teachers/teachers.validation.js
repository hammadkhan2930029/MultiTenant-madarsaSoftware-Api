import { z } from 'zod';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const teacherBodySchema = z.object({
  staffType: optionalStringField(50, 'عملہ کی قسم بہت لمبی ہے۔'),
  fullName: z.string().trim().min(2, 'استاد کا نام لازمی ہے۔').max(150, 'استاد کا نام بہت لمبا ہے۔'),
  email: z
    .union([z.string().trim().email('درست ای میل درج کریں۔').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  phone: optionalStringField(50, 'فون نمبر بہت لمبا ہے۔'),
  cnic: optionalStringField(50, 'شناختی کارڈ نمبر بہت لمبا ہے۔'),
  subject: optionalStringField(150, 'مضمون / ذمہ داری بہت لمبی ہے۔'),
  qualification: optionalStringField(150, 'تعلیمی قابلیت بہت لمبی ہے۔'),
  educationInstitute: optionalStringField(150, 'تعلیمی ادارہ بہت لمبا ہے۔'),
  educationYear: optionalStringField(20, 'تعلیمی سال بہت لمبا ہے۔'),
  specialization: optionalStringField(150, 'تخصص بہت لمبا ہے۔'),
  address: optionalStringField(255, 'پتہ بہت لمبا ہے۔'),
  basicSalary: z.coerce.number().positive('بنیادی تنخواہ صفر سے زیادہ ہونی چاہیے۔'),
  bankName: optionalStringField(150, 'بینک کا نام بہت لمبا ہے۔'),
  accountTitle: optionalStringField(150, 'اکاؤنٹ ٹائٹل بہت لمبا ہے۔'),
  accountNumber: optionalStringField(100, 'اکاؤنٹ نمبر بہت لمبا ہے۔'),
  iban: optionalStringField(100, 'IBAN بہت لمبا ہے۔'),
  jobTitle: optionalStringField(150, 'عہدہ بہت لمبا ہے۔'),
  department: optionalStringField(150, 'شعبہ بہت لمبا ہے۔'),
  employmentType: optionalStringField(100, 'ملازمت کی نوعیت بہت لمبی ہے۔'),
  appointmentDate: optionalStringField(20, 'تاریخ تقرری درست نہیں۔'),
  joiningDate: optionalStringField(20, 'تاریخ شمولیت درست نہیں۔'),
  experienceSummary: optionalStringField(500, 'تجربہ بہت لمبا ہے۔'),
  notes: optionalStringField(500, 'نوٹس بہت لمبے ہیں۔'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createTeacherValidationSchema = z.object({
  body: teacherBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listTeachersValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    subject: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    staffType: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const teacherIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('استاد کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const updateTeacherValidationSchema = z.object({
  body: teacherBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('استاد کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const updateTeacherStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'inactive']),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('استاد کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});
