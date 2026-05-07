import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createDailyValidationSchema), createDailyEntry);
router.get('/', validate(listDailyValidationSchema), getDailyEntries);
router.get('/:id', validate(dailyIdValidationSchema), getDailyEntryById);
router.put('/:id', validate(updateDailyValidationSchema), updateDailyEntry);
router.patch('/:id/deactivate', validate(dailyIdValidationSchema), deactivateDailyEntry);

export { router as dailyHifzRoutes };
