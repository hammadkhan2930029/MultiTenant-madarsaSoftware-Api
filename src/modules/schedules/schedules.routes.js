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

router.post('/', requirePermission('schedules.create'), validate(createScheduleValidationSchema), createSchedule);
router.get('/', requirePermission('schedules.view'), validate(listSchedulesValidationSchema), getSchedules);
router.put('/:id', requirePermission('schedules.edit'), validate(updateScheduleValidationSchema), updateSchedule);
router.delete('/:id', requirePermission('schedules.delete'), validate(scheduleIdValidationSchema), deleteSchedule);

export { router as schedulesRoutes };
