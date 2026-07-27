import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSchedule, deleteSchedule, getSchedules, updateSchedule } from './schedules.controller.js';
import {
  createScheduleValidationSchema,
  listSchedulesValidationSchema,
  scheduleIdValidationSchema,
  updateScheduleValidationSchema,
} from './schedules.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('students.schedule.view', 'schedules.create'), validate(createScheduleValidationSchema), createSchedule);
router.get('/', requirePermission('students.schedule.view', 'schedules.view'), validate(listSchedulesValidationSchema), getSchedules);
router.put('/:id', requirePermission('students.schedule.view', 'schedules.edit'), validate(updateScheduleValidationSchema), updateSchedule);
router.delete('/:id', requirePermission('students.schedule.view', 'schedules.delete'), validate(scheduleIdValidationSchema), deleteSchedule);

export { router as schedulesRoutes };
