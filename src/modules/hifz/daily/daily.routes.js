import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createDailyEntry,
  getDailyEntries,
  getDailyEntryById,
  updateDailyEntry,
  deactivateDailyEntry,
} from './daily.controller.js';
import {
  createDailyValidationSchema,
  listDailyValidationSchema,
  dailyIdValidationSchema,
  updateDailyValidationSchema,
} from './daily.validation.js';

const router = Router();

router.use(authMiddleware);
router.post('/', requirePermission('hifz.daily.create'), validate(createDailyValidationSchema), createDailyEntry);
router.get('/', requirePermission('hifz.daily.view'), validate(listDailyValidationSchema), getDailyEntries);
router.get('/:id', requirePermission('hifz.daily.view'), validate(dailyIdValidationSchema), getDailyEntryById);
router.put('/:id', requirePermission('hifz.daily.create'), validate(updateDailyValidationSchema), updateDailyEntry);
router.patch('/:id/deactivate', requirePermission('hifz.daily.create'), validate(dailyIdValidationSchema), deactivateDailyEntry);

export { router as dailyHifzRoutes };
