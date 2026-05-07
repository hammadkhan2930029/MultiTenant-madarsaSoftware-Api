import { z } from 'zod';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const parentLinkSchema = z.object({
  parentId: z.coerce.number().int().positive().optional(),
  fullName: z.string().trim().min(2, 'Parent full name is required.').max(150, 'Parent full name is too long.'),
  relationship: z.string().trim().min(2, 'Relationship is required.').max(50, 'Relationship is too long.'),
  isPrimary: z.coerce.boolean().optional(),
  phone: optionalStringField(50, 'Parent phone is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid parent email.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  cnic: optionalStringField(50, 'Parent CNIC is too long.'),
  occupation: optionalStringField(150, 'Parent occupation is too long.'),
  address: optionalStringField(255, 'Parent address is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

const studentBodySchema = z.object({
  admissionNumber: z.string().trim().min(2, 'Admission number is required.').max(100, 'Admission number is too long.'),
  fullName: z.string().trim().min(2, 'Student full name is required.').max(150, 'Student full name is too long.'),
  fatherName: z.string().trim().min(2, 'Father name is required.').max(150, 'Father name is too long.'),
  gender: z.enum(['male', 'female', 'other']),
  dob: z.coerce.date().optional(),
  phone: optionalStringField(50, 'Student phone is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid student email.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  address: optionalStringField(255, 'Address is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
  parents: z.array(parentLinkSchema).optional(),
});

export const createStudentValidationSchema = z.object({
  body: studentBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listStudentsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const studentIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Student id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateStudentValidationSchema = z.object({
  body: studentBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Student id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const assignStudentClassValidationSchema = z.object({
  body: z.object({
    branchId: z.coerce.number().int().positive('Branch id must be a valid number.'),
    classId: z.coerce.number().int().positive('Class id must be a valid number.'),
    sectionId: z.coerce.number().int().positive('Section id must be a valid number.'),
    sessionId: z.coerce.number().int().positive('Session id must be a valid number.'),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Student id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
