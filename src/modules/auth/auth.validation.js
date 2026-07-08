import { z } from 'zod';

export const loginValidationSchema = z.object({
  body: z.object({
    identity: z
      .string()
      .trim()
      .min(3, 'Email or username is required.')
      .max(150, 'Email or username is too long.'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long.')
      .max(100, 'Password is too long.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const changePasswordValidationSchema = z
  .object({
    body: z.object({
      currentPassword: z
        .string()
        .min(6, 'Current password must be at least 6 characters long.')
        .max(100, 'Current password is too long.'),
      newPassword: z
        .string()
        .min(6, 'New password must be at least 6 characters long.')
        .max(100, 'New password is too long.'),
      confirmPassword: z
        .string()
        .min(6, 'Confirm password must be at least 6 characters long.')
        .max(100, 'Confirm password is too long.'),
    }),
    params: z.object({}).default({}),
    query: z.object({}).default({}),
  })
  .superRefine((value, ctx) => {
    if (value.body.newPassword !== value.body.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['body', 'confirmPassword'],
        message: 'Confirm password does not match new password.',
      });
    }
  });

export const currentAdminValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined()]).transform((value) =>
    value === '' ? undefined : value
  );

const madrassaProfileBodySchema = z.object({
  name: z.string().trim().min(2, 'Profile name is required.').max(150, 'Profile name is too long.'),
  email: z.string().trim().email('Please enter a valid email address.').max(150, 'Email is too long.'),
  phone1: z.string().trim().min(1, 'Primary phone number is required.').max(50, 'Primary phone is too long.'),
  phone2: optionalStringField(50, 'Secondary phone is too long.'),
  address: z.string().trim().min(1, 'Complete address is required.').max(255, 'Address is too long.'),
  branch: optionalStringField(150, 'Branch is too long.'),
  city: optionalStringField(150, 'City is too long.'),
  familyNoSeq: optionalStringField(100, 'Family sequence number is too long.'),
  regNo: optionalStringField(100, 'Registration number is too long.'),
  logoUrl: optionalStringField(255, 'Logo URL is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const madrassaProfileValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateMadrassaProfileValidationSchema = z.object({
  body: madrassaProfileBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});
