import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createTeacherSchedule, deleteTeacherSchedule, getTeacherSchedules } from './teacher-schedules.controller.js';
import {
  createTeacherScheduleValidationSchema,
  listTeacherSchedulesValidationSchema,
  teacherScheduleIdValidationSchema,
} from './teacher-schedules.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createTeacherScheduleValidationSchema), createTeacherSchedule);
router.get('/', validate(listTeacherSchedulesValidationSchema), getTeacherSchedules);
router.delete('/:id', validate(teacherScheduleIdValidationSchema), deleteTeacherSchedule);

export { router as teacherSchedulesRoutes };
