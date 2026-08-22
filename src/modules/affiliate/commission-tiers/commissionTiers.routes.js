import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createCommissionTier,
  getCommissionTier,
  listCommissionTiers,
  updateCommissionTier,
  updateCommissionTierStatus,
} from './commissionTiers.controller.js';
import {
  commissionTierIdValidationSchema,
  createCommissionTierValidationSchema,
  listCommissionTiersValidationSchema,
  updateCommissionTierStatusValidationSchema,
  updateCommissionTierValidationSchema,
} from './commissionTiers.validation.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);
router.get('/', validate(listCommissionTiersValidationSchema), listCommissionTiers);
router.post('/', validate(createCommissionTierValidationSchema), createCommissionTier);
router.get('/:id', validate(commissionTierIdValidationSchema), getCommissionTier);
router.put('/:id', validate(updateCommissionTierValidationSchema), updateCommissionTier);
router.patch('/:id/status', validate(updateCommissionTierStatusValidationSchema), updateCommissionTierStatus);

export { router as commissionTiersRoutes };
