import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createExamSchedule, deleteExamSchedule, getExamSchedules } from './exam-schedules.controller.js';
import {
  createExamScheduleValidationSchema,
  examScheduleIdValidationSchema,
  listExamSchedulesValidationSchema,
} from './exam-schedules.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createExamScheduleValidationSchema), createExamSchedule);
router.get('/', validate(listExamSchedulesValidationSchema), getExamSchedules);
router.delete('/:id', validate(examScheduleIdValidationSchema), deleteExamSchedule);

export { router as examSchedulesRoutes };
