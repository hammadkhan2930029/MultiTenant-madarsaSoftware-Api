import { z } from 'zod';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const teacherBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Teacher full name is required.').max(150, 'Teacher full name is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid email address.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  phone: optionalStringField(50, 'Phone is too long.'),
  cnic: optionalStringField(50, 'CNIC is too long.'),
  subject: z.string().trim().min(2, 'Subject is required.').max(150, 'Subject is too long.'),
  qualification: optionalStringField(150, 'Qualification is too long.'),
  address: optionalStringField(255, 'Address is too long.'),
  basicSalary: z.coerce.number().positive('Basic salary must be greater than zero.'),
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
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const teacherIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Teacher id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateTeacherValidationSchema = z.object({
  body: teacherBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Teacher id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateTeacherStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'inactive']),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Teacher id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
