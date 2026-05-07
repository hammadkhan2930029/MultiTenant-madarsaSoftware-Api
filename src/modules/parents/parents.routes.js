import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createParent,
  getParents,
  getParentById,
  updateParent,
  deactivateParent,
} from './parents.controller.js';
import {
  createParentValidationSchema,
  listParentsValidationSchema,
  parentIdValidationSchema,
  updateParentValidationSchema,
} from './parents.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createParentValidationSchema), createParent);
router.get('/', validate(listParentsValidationSchema), getParents);
router.get('/:id', validate(parentIdValidationSchema), getParentById);
router.put('/:id', validate(updateParentValidationSchema), updateParent);
router.patch('/:id/deactivate', validate(parentIdValidationSchema), deactivateParent);

export { router as parentsRoutes };
