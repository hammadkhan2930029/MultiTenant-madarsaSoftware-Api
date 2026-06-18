import { z } from 'zod';

const permissionValueSchema = z.union([
  z.coerce.number().int().positive('Permission id must be a valid number.'),
  z.string().trim().min(1, 'Permission key is required.').max(150, 'Permission key is too long.'),
]);

const permissionsBodySchema = {
  permissions: z.array(permissionValueSchema).optional(),
  permissionIds: z.array(z.coerce.number().int().positive('Permission id must be a valid number.')).optional(),
  permissionKeys: z.array(z.string().trim().min(1, 'Permission key is required.').max(150, 'Permission key is too long.')).optional(),
};

const roleBodySchema = z.object({
  roleName: z
    .string()
    .trim()
    .min(2, 'Role name is required.')
    .max(100, 'Role name is too long.')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores.'),
  description: z.string().trim().max(255, 'Role description is too long.').optional().or(z.literal('')),
  ...permissionsBodySchema,
});

export const createRoleValidationSchema = z.object({
  body: roleBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listRolesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const roleIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Role id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateRoleValidationSchema = z.object({
  body: roleBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  }),
  params: z.object({
    id: z.coerce.number().int().positive('Role id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const assignRolePermissionsValidationSchema = z.object({
  body: z.object(permissionsBodySchema).refine(
    (value) =>
      Object.prototype.hasOwnProperty.call(value, 'permissions') ||
      Object.prototype.hasOwnProperty.call(value, 'permissionIds') ||
      Object.prototype.hasOwnProperty.call(value, 'permissionKeys'),
    {
      message: 'Permissions are required.',
    },
  ),
  params: z.object({
    id: z.coerce.number().int().positive('Role id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
