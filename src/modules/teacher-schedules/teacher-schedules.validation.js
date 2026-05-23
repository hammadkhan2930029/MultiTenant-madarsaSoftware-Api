import { z } from 'zod';

const nonEmptyStringArray = (message) => z.array(z.string().trim().min(1)).min(1, message);

const teacherScheduleBodySchema = z.object({
  teacherId: z.coerce.number().int().positive('Teacher id must be a valid number.'),
  sessionId: z.coerce.number().int().positive('Session id must be a valid number.'),
  classId: z.coerce.number().int().positive('Class id must be a valid number.'),
  sectionId: z.coerce.number().int().positive('Section id must be a valid number.'),
  subjects: nonEmptyStringArray('At least one subject is required.'),
  days: nonEmptyStringArray('At least one day is required.'),
  startTime: z.string().trim().min(1, 'Start time is required.').max(10, 'Start time is too long.'),
  endTime: z.string().trim().min(1, 'End time is required.').max(10, 'End time is too long.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createTeacherScheduleValidationSchema = z.object({
  body: teacherScheduleBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const listTeacherSchedulesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    teacherId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const teacherScheduleIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Schedule id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
