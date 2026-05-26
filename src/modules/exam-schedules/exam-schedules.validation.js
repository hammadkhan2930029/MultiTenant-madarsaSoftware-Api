import { z } from 'zod';

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const examScheduleBodySchema = z.object({
  examName: z.string().trim().min(1, 'Exam name is required.').max(150, 'Exam name is too long.'),
  sessionId: z.coerce.number().int().positive('Session id must be a valid number.'),
  classId: z.coerce.number().int().positive('Class id must be a valid number.'),
  subjectId: z.coerce.number().int().positive('Subject id must be a valid number.'),
  examDate: z.coerce.date({ required_error: 'Exam date is required.' }),
  startTime: z.string().trim().min(1, 'Start time is required.').max(10, 'Start time is too long.'),
  endTime: z.string().trim().min(1, 'End time is required.').max(10, 'End time is too long.'),
  totalMarks: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  room: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  invigilator: z.preprocess(emptyToUndefined, z.string().trim().max(150).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createExamScheduleValidationSchema = z.object({
  body: examScheduleBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listExamSchedulesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const examScheduleIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Exam schedule id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
