import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createScheduleValidationSchema), createSchedule);
router.get('/', validate(listSchedulesValidationSchema), getSchedules);
router.put('/:id', validate(updateScheduleValidationSchema), updateSchedule);
router.delete('/:id', validate(scheduleIdValidationSchema), deleteSchedule);

export { router as schedulesRoutes };
