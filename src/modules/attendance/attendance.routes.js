import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  markStudentAttendance,
  getStudentAttendance,
  markTeacherAttendance,
  getTeacherAttendance,
} from './attendance.controller.js';
import {
  markStudentAttendanceValidationSchema,
  getStudentAttendanceValidationSchema,
  markTeacherAttendanceValidationSchema,
  getTeacherAttendanceValidationSchema,
} from './attendance.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/students', validate(markStudentAttendanceValidationSchema), markStudentAttendance);
router.get('/students', validate(getStudentAttendanceValidationSchema), getStudentAttendance);
router.post('/teachers', validate(markTeacherAttendanceValidationSchema), markTeacherAttendance);
router.get('/teachers', validate(getTeacherAttendanceValidationSchema), getTeacherAttendance);

export { router as attendanceRoutes };
