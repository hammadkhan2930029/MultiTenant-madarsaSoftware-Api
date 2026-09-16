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
  markStaffAttendance,
  getStaffAttendance,
  deleteStaffAttendance,
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
router.post('/teachers', requirePermission('teachers.attendance.create', 'teachers.attendance.edit'), validate(markTeacherAttendanceValidationSchema), markTeacherAttendance);
router.get('/teachers', requirePermission('teachers.attendance.view', 'teachers.attendance.create', 'teachers.attendance.edit', 'teachers.attendance.delete'), validate(getTeacherAttendanceValidationSchema), getTeacherAttendance);
router.delete('/teachers', requirePermission('teachers.attendance.delete'), validate(deleteTeacherAttendanceValidationSchema), deleteTeacherAttendance);
router.post('/staff', requirePermission('staff.attendance.create', 'staff.attendance.edit'), validate(markTeacherAttendanceValidationSchema), markStaffAttendance);
router.get('/staff', requirePermission('staff.attendance.view', 'staff.attendance.create', 'staff.attendance.edit', 'staff.attendance.delete'), validate(getTeacherAttendanceValidationSchema), getStaffAttendance);
router.delete('/staff', requirePermission('staff.attendance.delete'), validate(deleteTeacherAttendanceValidationSchema), deleteStaffAttendance);

export { router as attendanceRoutes };
