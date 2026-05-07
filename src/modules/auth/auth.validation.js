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
