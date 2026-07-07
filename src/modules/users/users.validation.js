import { z } from 'zod';

const userBaseSchema = {
  name: z.string().trim().min(2, 'User name is required.').max(150, 'User name is too long.'),
  email: z.string().trim().email('Valid email is required.').max(150, 'Email is too long.'),
  phone: z.string().trim().max(50, 'Phone is too long.').optional().or(z.literal('')),
  username: z.string().trim().min(3, 'Username is required.').max(100, 'Username is too long.').optional(),
  roleId: z.coerce.number().int().positive('Role is required.'),
  status: z.enum(['active', 'inactive']).optional(),
};

export const createUserValidationSchema = z.object({
  body: z.object({
    ...userBaseSchema,
    password: z.string().min(8, 'Password must be at least 8 characters.').max(100, 'Password is too long.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listUsersValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    roleId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const userIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('User id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateUserValidationSchema = z.object({
  body: z
    .object({
      name: userBaseSchema.name.optional(),
      email: userBaseSchema.email.optional(),
      phone: userBaseSchema.phone,
      username: userBaseSchema.username.optional(),
      status: userBaseSchema.status,
      password: z.string().min(8, 'Password must be at least 8 characters.').max(100, 'Password is too long.').optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required.',
    }),
  params: z.object({
    id: z.coerce.number().int().positive('User id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const assignUserRoleValidationSchema = z.object({
  body: z.object({
    roleId: userBaseSchema.roleId,
  }),
  params: z.object({
    id: z.coerce.number().int().positive('User id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
