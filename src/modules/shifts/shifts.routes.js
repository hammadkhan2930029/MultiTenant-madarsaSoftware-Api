import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  bulkCreateShifts,
  createShift,
  deleteShift,
  getShiftById,
  getShifts,
  updateShift,
} from './shifts.controller.js';
import {
  bulkCreateShiftsValidationSchema,
  createShiftValidationSchema,
  listShiftsValidationSchema,
  shiftIdValidationSchema,
  updateShiftValidationSchema,
} from './shifts.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requireAnyPermission('settings.shifts.create', 'settings.update', 'settings.edit'), validate(createShiftValidationSchema), createShift);
router.post('/bulk', requireAnyPermission('settings.shifts.create', 'settings.update', 'settings.edit'), validate(bulkCreateShiftsValidationSchema), bulkCreateShifts);
router.get('/', requireAnyPermission('settings.shifts.view', 'settings.view'), validate(listShiftsValidationSchema), getShifts);
router.get('/:id', requireAnyPermission('settings.shifts.view', 'settings.view'), validate(shiftIdValidationSchema), getShiftById);
router.patch('/:id', requireAnyPermission('settings.shifts.update', 'settings.update', 'settings.edit'), validate(updateShiftValidationSchema), updateShift);
router.delete('/:id', requireAnyPermission('settings.shifts.delete', 'settings.update', 'settings.edit'), validate(shiftIdValidationSchema), deleteShift);

export { router as shiftsRoutes };
