import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createTeacherSchedule, deleteTeacherSchedule, getTeacherSchedules } from './teacher-schedules.controller.js';
import {
  createTeacherScheduleValidationSchema,
  listTeacherSchedulesValidationSchema,
  teacherScheduleIdValidationSchema,
} from './teacher-schedules.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('teachers.update'), validate(createTeacherScheduleValidationSchema), createTeacherSchedule);
router.get('/', requirePermission('teachers.view'), validate(listTeacherSchedulesValidationSchema), getTeacherSchedules);
router.delete('/:id', requirePermission('teachers.update'), validate(teacherScheduleIdValidationSchema), deleteTeacherSchedule);

export { router as teacherSchedulesRoutes };
