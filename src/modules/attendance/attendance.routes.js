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

router.post('/students', requirePermission('attendance.mark'), validate(markStudentAttendanceValidationSchema), markStudentAttendance);
router.get('/students', requirePermission('attendance.view'), validate(getStudentAttendanceValidationSchema), getStudentAttendance);
router.post('/teachers', requirePermission('attendance.mark'), validate(markTeacherAttendanceValidationSchema), markTeacherAttendance);
router.get('/teachers', requirePermission('attendance.view'), validate(getTeacherAttendanceValidationSchema), getTeacherAttendance);
router.delete('/teachers', requirePermission('attendance.delete'), validate(deleteTeacherAttendanceValidationSchema), deleteTeacherAttendance);

export { router as attendanceRoutes };
