import { z } from 'zod';

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const parentBodySchema = z.object({
  fullName: z.string().trim().min(2, 'Parent full name is required.').max(150, 'Parent full name is too long.'),
  familyNumber: optionalStringField(100, 'Family number is too long.'),
  phone: optionalStringField(50, 'Phone is too long.'),
  email: z
    .union([z.string().trim().email('Please enter a valid email address.').max(150), z.literal(''), z.undefined()])
    .transform((value) => (value === '' ? undefined : value)),
  cnic: optionalStringField(50, 'CNIC is too long.'),
  occupation: optionalStringField(150, 'Occupation is too long.'),
  address: optionalStringField(255, 'Address is too long.'),
});

export const createParentValidationSchema = z.object({
  body: parentBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listParentsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
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
