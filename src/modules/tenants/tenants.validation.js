import { z } from 'zod';
import { normalizeDomainName } from '../../utils/domain.js';

const tenantStatusSchema = z.enum(['active', 'inactive']);

const domainSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    return normalizeDomainName(value);
  },
  z
    .string()
    .max(191)
    .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, 'Please enter a valid domain.')
    .optional()
    .nullable()
);

const tenantCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Tenant code can include lowercase letters, numbers, underscores, and hyphens.');

const optionalStringField = (max, message) =>
  z.union([z.string().trim().max(max, message), z.literal(''), z.undefined(), z.null()]).transform((value) =>
    value === '' ? undefined : value
  );

const tenantAdminSchema = z.object({
  name: z.string().trim().min(2, 'Tenant admin name is required.').max(150, 'Tenant admin name is too long.'),
  email: z.string().trim().email('Valid tenant admin email is required.').max(150, 'Tenant admin email is too long.'),
  username: z.string().trim().min(3, 'Tenant admin username is required.').max(100, 'Tenant admin username is too long.'),
  password: z.string().min(8, 'Tenant admin password must be at least 8 characters.').max(100, 'Tenant admin password is too long.'),
});

const initialProfileSchema = z.object({
  name: optionalStringField(150, 'Profile name is too long.'),
  email: z.union([z.string().trim().email('Please enter a valid profile email.').max(150), z.literal(''), z.undefined(), z.null()]).transform((value) =>
    value === '' ? undefined : value
  ),
  phone1: optionalStringField(50, 'Primary phone is too long.'),
  phone2: optionalStringField(50, 'Secondary phone is too long.'),
  address: optionalStringField(255, 'Address is too long.'),
  branch: optionalStringField(150, 'Branch is too long.'),
  city: optionalStringField(150, 'City is too long.'),
  familyNoSeq: optionalStringField(100, 'Family sequence number is too long.'),
  regNo: optionalStringField(100, 'Registration number is too long.'),
  logoUrl: optionalStringField(255, 'Logo URL is too long.'),
}).optional().default({});

const tenantBaseSchema = {
  tenantCode: tenantCodeSchema,
  name: z.string().trim().min(2).max(191),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Please enter a valid subdomain.')
    .optional()
    .nullable(),
  customDomain: domainSchema,
  status: tenantStatusSchema.optional(),
  ownerAdminId: z.coerce.number().int().positive().optional().nullable(),
};

export const createTenantValidationSchema = z.object({
  body: z.object({
    ...tenantBaseSchema,
    admin: tenantAdminSchema,
    profile: initialProfileSchema,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listTenantsValidationSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    status: tenantStatusSchema.optional(),
  }).optional(),
});

export const tenantIdValidationSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  query: z.object({}).optional(),
});

export const updateTenantValidationSchema = z.object({
  body: z.object({
    name: tenantBaseSchema.name.optional(),
    subdomain: tenantBaseSchema.subdomain,
    customDomain: tenantBaseSchema.customDomain,
    status: tenantStatusSchema.optional(),
    ownerAdminId: tenantBaseSchema.ownerAdminId,
  }),
  params: tenantIdValidationSchema.shape.params,
  query: z.object({}).optional(),
});
