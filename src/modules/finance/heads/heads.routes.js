import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createHead,
  getHeads,
  getHeadById,
  updateHead,
  deactivateHead,
} from './heads.controller.js';
import {
  createHeadValidationSchema,
  listHeadsValidationSchema,
  headIdValidationSchema,
  updateHeadValidationSchema,
} from './heads.validation.js';

const router = Router();

router.use(authMiddleware);
router.post('/', requirePermission('fees.create'), validate(createHeadValidationSchema), createHead);
router.get('/', requirePermission('fees.view'), validate(listHeadsValidationSchema), getHeads);
router.get('/:id', requirePermission('fees.view'), validate(headIdValidationSchema), getHeadById);
router.put('/:id', requirePermission('fees.update'), validate(updateHeadValidationSchema), updateHead);
router.patch('/:id/deactivate', requirePermission('fees.delete'), validate(headIdValidationSchema), deactivateHead);

export { router as headsRoutes };
