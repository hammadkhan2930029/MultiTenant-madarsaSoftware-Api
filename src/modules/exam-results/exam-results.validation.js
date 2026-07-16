import { z } from 'zod';

const optionalString = (max) =>
  z.union([z.string().trim().max(max), z.literal(''), z.undefined(), z.null()]).transform((value) => (value ? value : undefined));

const subjectMarksSchema = z.object({
  subjectId: z.coerce.number().int().positive('Subject is required.'),
  totalMarks: z.coerce.number().int().positive('Total marks must be greater than 0.'),
  obtainedMarks: z.coerce.number().int().min(0, 'Obtained marks cannot be negative.'),
}).refine((value) => value.obtainedMarks <= value.totalMarks, {
  message: 'Obtained marks cannot be greater than total marks.',
  path: ['obtainedMarks'],
});

const examResultBodySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive('Student is required.'),
  sessionId: z.coerce.number().int().positive('Session is required.'),
  classId: z.coerce.number().int().positive('Class is required.'),
  sectionId: z.union([z.coerce.number().int().positive(), z.literal(''), z.null(), z.undefined()]).transform((value) => (value ? Number(value) : null)),
  examName: optionalString(150),
  remarks: optionalString(255),
  status: z.enum(['active', 'inactive']).optional(),
  subjects: z.array(subjectMarksSchema).min(1, 'At least one subject result is required.'),
});

export const saveExamResultValidationSchema = z.object({
  body: examResultBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const updateExamResultValidationSchema = z.object({
  body: examResultBodySchema,
  params: z.object({
    id: z.coerce.number().int().positive('Exam result id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});

export const listExamResultsValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    search: z.string().trim().optional(),
    studentId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    sessionId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const findStudentExamResultValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    studentId: z.coerce.number().int().positive('Student id must be a valid number.'),
  }),
  query: z.object({
    sessionId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    examName: z.string().trim().optional(),
  }),
});

export const examResultIdValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    id: z.coerce.number().int().positive('Exam result id must be a valid number.'),
  }),
  query: z.object({}).default({}),
});
