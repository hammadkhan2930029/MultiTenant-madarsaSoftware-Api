import { z } from 'zod';
import { optionalCnicField } from '../../utils/cnicValidation.js';
import { optionalPhoneField, requiredPhoneField } from '../../utils/phoneValidation.js';
import { urduRelationshipField } from '../../utils/relationshipValidation.js';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const requiredStringField = (min, max, requiredMessage, maxMessage) =>
  z.string().trim().min(min, requiredMessage).max(max, maxMessage);

const optionalUrduRelationshipField = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  urduRelationshipField().optional(),
);

const parentBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Parent full name is required.').max(150, 'Parent full name is too long.'),
  familyNumber: optionalStringField(100, 'Family number is too long.'),
  phone: requiredPhoneField('فون نمبر درج کرنا ضروری ہے۔'),
  whatsapp: optionalPhoneField(),
  email: z
    .union([z.string().trim().email('Please enter a valid email address.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  cnic: optionalCnicField(),
  occupation: optionalStringField(150, 'Occupation is too long.'),
  address: requiredStringField(1, 255, 'Address is required.', 'Address is too long.'),
});

const parentCreateBodySchema = parentBodySchema.extend({
  studentId: z.coerce.number().int().positive('Student id must be a valid number.').optional(),
  relationship: optionalUrduRelationshipField,
}).superRefine((value, context) => {
  if (value.studentId && !value.relationship) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationship'],
      message: 'طالب علم کے ساتھ رشتہ درج کریں۔',
    });
  }
});

export const createParentValidationSchema = z.object({
  body: parentCreateBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listParentsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    branchId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const parentIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Parent id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateParentValidationSchema = z.object({
  body: parentBodySchema.extend({
    status: z.enum(['active', 'inactive']).optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Parent id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
