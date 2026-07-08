import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createMonthlyEntry,
  getMonthlyEntries,
  getMonthlyEntryById,
  updateMonthlyEntry,
  deactivateMonthlyEntry,
} from './monthly.controller.js';
import {
  createMonthlyValidationSchema,
  listMonthlyValidationSchema,
  monthlyIdValidationSchema,
  updateMonthlyValidationSchema,
} from './monthly.validation.js';

const router = Router();
router.use(authMiddleware);
router.post('/', requirePermission('hifz.monthly.create'), validate(createMonthlyValidationSchema), createMonthlyEntry);
router.get('/', requirePermission('hifz.monthly.view'), validate(listMonthlyValidationSchema), getMonthlyEntries);
router.get('/:id', requirePermission('hifz.monthly.view'), validate(monthlyIdValidationSchema), getMonthlyEntryById);
router.put('/:id', requirePermission('hifz.monthly.create'), validate(updateMonthlyValidationSchema), updateMonthlyEntry);
router.patch('/:id/deactivate', requirePermission('hifz.monthly.create'), validate(monthlyIdValidationSchema), deactivateMonthlyEntry);

export { router as monthlyHifzRoutes };
