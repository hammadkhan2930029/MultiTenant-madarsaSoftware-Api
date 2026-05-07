import { z } from 'zod';

const attendanceStatus = z.enum(['Present', 'Absent', 'Leave', 'Late']);

const optionalRemarks = z
  .union([z.string().trim().max(255, 'Remarks are too long.'), z.literal(''), z.undefined()])
  .transform((value) => (value === '' ? undefined : value));

export const markStudentAttendanceValidationSchema = z.object({
  body: z.object({
    studentId: z.coerce.number().int().positive('Student id must be a valid number.'),
    branchId: z.coerce.number().int().positive('Branch id must be a valid number.'),
    classId: z.coerce.number().int().positive('Class id must be a valid number.'),
    sectionId: z.coerce.number().int().positive('Section id must be a valid number.'),
    date: z.coerce.date({ message: 'Attendance date is required.' }),
    status: attendanceStatus,
    remarks: optionalRemarks,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const getStudentAttendanceValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    date: z.coerce.date().optional(),
    studentId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    status: attendanceStatus.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const markTeacherAttendanceValidationSchema = z.object({
  body: z.object({
    teacherId: z.coerce.number().int().positive('Teacher id must be a valid number.'),
    branchId: z.coerce.number().int().positive('Branch id must be a valid number.'),
    date: z.coerce.date({ message: 'Attendance date is required.' }),
    status: attendanceStatus,
    remarks: optionalRemarks,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export const getTeacherAttendanceValidationSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    date: z.coerce.date().optional(),
    teacherId: z.coerce.number().int().positive().optional(),
    branchId: z.coerce.number().int().positive().optional(),
    status: attendanceStatus.optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
