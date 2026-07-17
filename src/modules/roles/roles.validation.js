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

const roleBodyShape = {
  tenantId: z.coerce.number().int().positive('Tenant id must be a valid number.').optional(),
  branchId: z.coerce.number().int().positive('Branch id must be a valid number.').optional().nullable(),
  name: z
    .string()
    .trim()
    .min(2, 'Role name is required.')
    .max(100, 'Role name is too long.')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores.')
    .optional(),
  roleName: z
    .string()
    .trim()
    .min(2, 'Role name is required.')
    .max(100, 'Role name is too long.')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores.')
    .optional(),
  description: z.string().trim().max(255, 'Role description is too long.').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
  ...permissionsBodySchema,
};

const roleBodySchema = z.object(roleBodyShape).refine((value) => value.roleName || value.name, {
  message: 'Role name is required.',
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
    status: z.enum(['active', 'inactive']).optional(),
    tenantId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    scope: z.enum(['all', 'global', 'tenant']).optional(),
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
  body: z.object(roleBodyShape).partial().refine((value) => Object.keys(value).length > 0, {
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
