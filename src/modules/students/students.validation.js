import { z } from 'zod';
import { optionalCnicField } from '../../utils/cnicValidation.js';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const optionalDateField = z
  .union([z.coerce.date(), z.literal(''), z.undefined()])
  .transform((value) => (value === '' ? undefined : value));

const requiredDateField = (message) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.date({
      required_error: message,
      invalid_type_error: message,
    })
  );

const optionalNumberField = (message) =>
  z.union([z.coerce.number().nonnegative(message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const requiredNumberField = (requiredMessage, invalidMessage) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce
      .number({
        required_error: requiredMessage,
        invalid_type_error: invalidMessage,
      })
      .nonnegative(invalidMessage)
  );

const requiredStringField = (min, max, requiredMessage, maxMessage) =>
  z.string().trim().min(min, requiredMessage).max(max, maxMessage);

const parentLinkSchema = z.object({
  parentId: z.coerce.number().int().positive().optional(),
  fullName: z.string().trim().min(2, 'Parent full name is required.').max(150, 'Parent full name is too long.'),
  familyNumber: optionalStringField(100, 'Family number is too long.'),
  relationship: z.string().trim().min(2, 'Relationship is required.').max(50, 'Relationship is too long.'),
  isPrimary: z.coerce.boolean().optional(),
  phone: optionalStringField(50, 'Parent phone is too long.'),
  whatsapp: optionalStringField(50, 'Parent WhatsApp number is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid parent email.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  cnic: optionalCnicField(),
  occupation: optionalStringField(150, 'Parent occupation is too long.'),
  address: optionalStringField(255, 'Parent address is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

const studentBodySchema = z.object({
  branchId: z.coerce.number().int().positive('Branch id must be a valid number.').optional(),
  admissionNumber: optionalStringField(100, 'Admission number is too long.'),
  admissionDate: requiredDateField('تاریخ داخلہ لازمی منتخب کریں۔'),
  admissionFee: requiredNumberField('داخلہ فیس لازمی درج کریں۔', 'داخلہ فیس درست درج کریں۔'),
  fullName: z.string().trim().min(2, 'طالب علم کا نام لازمی درج کریں۔').max(150, 'طالب علم کا نام بہت لمبا ہے۔'),
  fatherName: z.string().trim().min(2, 'والد کا نام لازمی درج کریں۔').max(150, 'والد کا نام بہت لمبا ہے۔'),
  gender: z.enum(['male', 'female', 'other']),
  caste: optionalStringField(100, 'Caste is too long.'),
  cnic: optionalCnicField(),
  dob: requiredDateField('تاریخ پیدائش لازمی منتخب کریں۔'),
  bForm: optionalStringField(50, 'B-Form is too long.'),
  phone: optionalStringField(50, 'Student phone is too long.'),
  whatsapp: optionalStringField(50, 'WhatsApp number is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid student email.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  address: optionalStringField(255, 'Address is too long.'),
  currentAddress: requiredStringField(2, 255, 'حالیہ پتہ لازمی درج کریں۔', 'حالیہ پتہ بہت لمبا ہے۔'),
  permanentAddress: requiredStringField(2, 255, 'مستقل پتہ لازمی درج کریں۔', 'مستقل پتہ بہت لمبا ہے۔'),
  district: optionalStringField(150, 'District is too long.'),
  prevMadrassa: optionalStringField(150, 'Previous madrassa is too long.'),
  prevSchool: optionalStringField(150, 'Previous school is too long.'),
  secularEdu: optionalStringField(150, 'Secular education detail is too long.'),
  religiousEdu: optionalStringField(150, 'Religious education detail is too long.'),
  requiredClass: optionalStringField(150, 'Required class is too long.'),
  requiredJamaat: optionalStringField(150, 'Required jamaat is too long.'),
  teacherName: optionalStringField(150, 'Teacher name is too long.'),
  medicalCondition: optionalStringField(255, 'Medical condition detail is too long.'),
  monthlyFee: requiredNumberField('ماہانہ فیس لازمی درج کریں۔', 'ماہانہ فیس درست درج کریں۔'),
  reside: optionalStringField(20, 'Residence detail is too long.'),
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

export const classAssignmentIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    assignmentId: z.coerce.number().int().positive('Assignment id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
