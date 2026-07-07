import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createShift,
  deleteShift,
  getShiftById,
  getShifts,
  updateShift,
} from './shifts.controller.js';
import {
  createShiftValidationSchema,
  listShiftsValidationSchema,
  shiftIdValidationSchema,
  updateShiftValidationSchema,
} from './shifts.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('settings.update'), validate(createShiftValidationSchema), createShift);
router.get('/', requirePermission('settings.view'), validate(listShiftsValidationSchema), getShifts);
router.get('/:id', requirePermission('settings.view'), validate(shiftIdValidationSchema), getShiftById);
router.patch('/:id', requirePermission('settings.update'), validate(updateShiftValidationSchema), updateShift);
router.delete('/:id', requirePermission('settings.update'), validate(shiftIdValidationSchema), deleteShift);

export { router as shiftsRoutes };
