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
router.post('/', requirePermission('finance.heads.create', 'fees.create'), validate(createHeadValidationSchema), createHead);
router.get('/', requirePermission('finance.heads.view', 'finance.heads.create', 'finance.heads.update', 'finance.heads.delete', 'fees.view', 'salary.view', 'salary.create', 'salary.edit'), validate(listHeadsValidationSchema), getHeads);
router.get('/:id', requirePermission('finance.heads.view', 'finance.heads.create', 'finance.heads.update', 'finance.heads.delete', 'fees.view'), validate(headIdValidationSchema), getHeadById);
router.put('/:id', requirePermission('finance.heads.update', 'finance.heads.create', 'fees.update'), validate(updateHeadValidationSchema), updateHead);
router.patch('/:id/deactivate', requirePermission('finance.heads.delete', 'finance.heads.create', 'fees.delete'), validate(headIdValidationSchema), deactivateHead);

export { router as headsRoutes };
