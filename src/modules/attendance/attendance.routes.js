import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  markStudentAttendance,
  getStudentAttendance,
  markTeacherAttendance,
  getTeacherAttendance,
  deleteTeacherAttendance,
} from './attendance.controller.js';
import {
  markStudentAttendanceValidationSchema,
  getStudentAttendanceValidationSchema,
  markTeacherAttendanceValidationSchema,
  getTeacherAttendanceValidationSchema,
  deleteTeacherAttendanceValidationSchema,
} from './attendance.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/students', requirePermission('attendance.create', 'attendance.edit'), validate(markStudentAttendanceValidationSchema), markStudentAttendance);
router.get('/students', requirePermission('attendance.view', 'attendance.create', 'attendance.edit', 'attendance.history.view'), validate(getStudentAttendanceValidationSchema), getStudentAttendance);
router.post('/teachers', requirePermission('attendance.create', 'teachers.attendance.create', 'teachers.attendance.view'), validate(markTeacherAttendanceValidationSchema), markTeacherAttendance);
router.get('/teachers', requirePermission('attendance.view', 'teachers.attendance.view'), validate(getTeacherAttendanceValidationSchema), getTeacherAttendance);
router.delete('/teachers', requirePermission('attendance.delete', 'teachers.attendance.view'), validate(deleteTeacherAttendanceValidationSchema), deleteTeacherAttendance);

export { router as attendanceRoutes };
