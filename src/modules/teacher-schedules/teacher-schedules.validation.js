import { z } from 'zod';

const nonEmptyStringArray = (message) => z.array(z.string().trim().min(1)).min(1, message);

const teacherScheduleBodySchema = z.object({
  teacherId: z.coerce.number().int().positive('استاد کا نمبر درست ہونا چاہیے۔'),
  sessionId: z.coerce.number().int().positive('سیشن کا نمبر درست ہونا چاہیے۔'),
  classId: z.coerce.number().int().positive('کلاس کا نمبر درست ہونا چاہیے۔'),
  sectionId: z.coerce.number().int().positive('سیکشن کا نمبر درست ہونا چاہیے۔'),
  subjects: nonEmptyStringArray('کم از کم ایک مضمون لازمی ہے۔'),
  days: nonEmptyStringArray('کم از کم ایک دن لازمی ہے۔'),
  startTime: z.string().trim().min(1, 'شروع کا وقت لازمی ہے۔').max(10, 'شروع کا وقت بہت لمبا ہے۔'),
  endTime: z.string().trim().min(1, 'ختم کا وقت لازمی ہے۔').max(10, 'ختم کا وقت بہت لمبا ہے۔'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createTeacherScheduleValidationSchema = z.object({
  body: teacherScheduleBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateTeacherScheduleValidationSchema = z.object({
  body: teacherScheduleBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Ø´ÛŒÚˆÙˆÙ„ Ú©Ø§ Ù†Ù…Ø¨Ø± Ø¯Ø±Ø³Øª ÛÙˆÙ†Ø§ Ú†Ø§ÛÛŒÛ’Û”'),
  }),
  query: z.object({}).default({}),
});

export const listTeacherSchedulesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    teacherId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
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
    id: z.coerce.number().int().positive('شیڈول کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});
