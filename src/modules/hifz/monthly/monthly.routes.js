import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createMonthlyValidationSchema), createMonthlyEntry);
router.get('/', validate(listMonthlyValidationSchema), getMonthlyEntries);
router.get('/:id', validate(monthlyIdValidationSchema), getMonthlyEntryById);
router.put('/:id', validate(updateMonthlyValidationSchema), updateMonthlyEntry);
router.patch('/:id/deactivate', validate(monthlyIdValidationSchema), deactivateMonthlyEntry);

export { router as monthlyHifzRoutes };
