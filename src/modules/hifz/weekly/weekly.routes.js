import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
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
router.post('/', requirePermission('hifz.weekly.create'), validate(createWeeklyValidationSchema), createWeeklyEntry);
router.get('/', requirePermission('hifz.weekly.view'), validate(listWeeklyValidationSchema), getWeeklyEntries);
router.get('/:id', requirePermission('hifz.weekly.view'), validate(weeklyIdValidationSchema), getWeeklyEntryById);
router.put('/:id', requirePermission('hifz.weekly.create'), validate(updateWeeklyValidationSchema), updateWeeklyEntry);
router.patch('/:id/deactivate', requirePermission('hifz.weekly.create'), validate(weeklyIdValidationSchema), deactivateWeeklyEntry);

export { router as weeklyHifzRoutes };
