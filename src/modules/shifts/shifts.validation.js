import { z } from 'zod';

const timeField = (label) =>
  z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, `${label} must be in HH:MM format.`);

const shiftBodySchema = z.object({
  name: z.string().trim().min(2, 'Shift name is required.').max(150, 'Shift name is too long.'),
  startTime: timeField('Start time'),
  endTime: timeField('End time'),
  type: z.string().trim().min(2, 'Shift type is required.').max(50, 'Shift type is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createShiftValidationSchema = z.object({
  body: shiftBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const bulkCreateShiftsValidationSchema = z.object({
  body: z.object({
    shifts: z.array(shiftBodySchema).min(1, 'At least one shift is required.').max(50, 'Too many shifts in one request.'),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listShiftsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const shiftIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Shift id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const updateShiftValidationSchema = z.object({
  body: shiftBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Shift id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
