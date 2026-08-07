import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission, requireResourceRead } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  deactivateParent,
  deleteParent,
} from './parents.controller.js';
import {
  createParentValidationSchema,
  listParentsValidationSchema,
  parentIdValidationSchema,
  updateParentValidationSchema,
} from './parents.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('parents.create'), validate(createParentValidationSchema), createParent);
router.get('/', requireResourceRead('parents', 'parents.view'), validate(listParentsValidationSchema), getParents);
router.get('/:id', requireResourceRead('parents', 'parents.view'), validate(parentIdValidationSchema), getParentById);
router.put('/:id', requirePermission('parents.edit'), validate(updateParentValidationSchema), updateParent);
router.patch('/:id/deactivate', requirePermission('parents.delete'), validate(parentIdValidationSchema), deactivateParent);
router.delete('/:id', requirePermission('parents.delete'), validate(parentIdValidationSchema), deleteParent);

export { router as parentsRoutes };
