import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createExamSchedule, deleteExamSchedule, getExamSchedules, updateExamSchedule } from './exam-schedules.controller.js';
import {
  createExamScheduleValidationSchema,
  examScheduleIdValidationSchema,
  listExamSchedulesValidationSchema,
  updateExamScheduleValidationSchema,
} from './exam-schedules.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('exams.create'), validate(createExamScheduleValidationSchema), createExamSchedule);
router.get('/', requirePermission(['exams.view', 'exam_results.create']), validate(listExamSchedulesValidationSchema), getExamSchedules);
router.put('/:id', requirePermission('exams.update'), validate(updateExamScheduleValidationSchema), updateExamSchedule);
router.delete('/:id', requirePermission('exams.delete'), validate(examScheduleIdValidationSchema), deleteExamSchedule);

export { router as examSchedulesRoutes };
