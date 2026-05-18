import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createShiftValidationSchema), createShift);
router.get('/', validate(listShiftsValidationSchema), getShifts);
router.get('/:id', validate(shiftIdValidationSchema), getShiftById);
router.patch('/:id', validate(updateShiftValidationSchema), updateShift);
router.delete('/:id', validate(shiftIdValidationSchema), deleteShift);

export { router as shiftsRoutes };
