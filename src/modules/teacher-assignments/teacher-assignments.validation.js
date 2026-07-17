import { z } from 'zod';

const id = (message) => z.coerce.number().int().positive(message);
const optionalId = () => z.coerce.number().int().positive().optional();
const nonEmptyText = (message, max = 150) => z.string().trim().min(1, message).max(max, 'متن بہت لمبا ہے۔');
const textArray = z.array(z.string().trim().min(1).max(150)).default([]);

export const createTeacherAssignmentValidationSchema = z.object({
  body: z.object({
    teacherId: id('استاد منتخب کریں۔'),
    subjectIds: z.array(id('مضمون درست منتخب کریں۔')).min(1, 'کم از کم ایک مضمون منتخب کریں۔'),
    classId: id('جماعت منتخب کریں۔'),
    sectionId: id('سیکشن منتخب کریں۔'),
    responsibilityIds: z.array(id('ذمہ داری درست منتخب کریں۔')).optional().default([]),
    responsibilities: textArray,
    status: z.enum(['active', 'inactive']).optional(),
    branchId: optionalId(),
  }).refine((value) => value.responsibilityIds.length || value.responsibilities.length, {
    message: 'کم از کم ایک ذمہ داری درج کریں۔',
    path: ['responsibilities'],
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateTeacherAssignmentValidationSchema = z.object({
  body: z.object({
    teacherId: optionalId(),
    subjectId: optionalId(),
    classId: optionalId(),
    sectionId: optionalId(),
    responsibilityId: optionalId(),
    responsibility: nonEmptyText('ذمہ داری درج کریں۔').optional(),
    status: z.enum(['active', 'inactive']).optional(),
    branchId: optionalId(),
  }),
  params: z.object({
    id: id('تقسیم کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const listTeacherAssignmentsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    teacherId: optionalId(),
    subjectId: optionalId(),
    classId: optionalId(),
    sectionId: optionalId(),
    responsibilityId: optionalId(),
    branchId: optionalId(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const listResponsibilitiesValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    branchId: optionalId(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const teacherAssignmentIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: id('تقسیم کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});

export const updateTeacherAssignmentStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'inactive']),
  }),
  params: z.object({
    id: id('تقسیم کا نمبر درست ہونا چاہیے۔'),
  }),
  query: z.object({}).default({}),
});
