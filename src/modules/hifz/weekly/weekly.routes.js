import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createWeeklyEntry,
  getWeeklyEntries,
  getWeeklyEntryById,
  updateWeeklyEntry,
  deactivateWeeklyEntry,
} from './weekly.controller.js';
import {
  createWeeklyValidationSchema,
  listWeeklyValidationSchema,
  weeklyIdValidationSchema,
  updateWeeklyValidationSchema,
} from './weekly.validation.js';

const router = Router();
router.use(authMiddleware);
router.post('/', validate(createWeeklyValidationSchema), createWeeklyEntry);
router.get('/', validate(listWeeklyValidationSchema), getWeeklyEntries);
router.get('/:id', validate(weeklyIdValidationSchema), getWeeklyEntryById);
router.put('/:id', validate(updateWeeklyValidationSchema), updateWeeklyEntry);
router.patch('/:id/deactivate', validate(weeklyIdValidationSchema), deactivateWeeklyEntry);

export { router as weeklyHifzRoutes };
