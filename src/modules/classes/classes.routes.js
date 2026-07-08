import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
} from './classes.controller.js';
import {
  createClassValidationSchema,
  listClassesValidationSchema,
  classIdValidationSchema,
  updateClassValidationSchema,
} from './classes.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('classes.create'), validate(createClassValidationSchema), createClass);
router.get('/', requirePermission('classes.view'), validate(listClassesValidationSchema), getClasses);
router.get('/:id', requirePermission('classes.view'), validate(classIdValidationSchema), getClassById);
router.patch('/:id', requirePermission('classes.update'), validate(updateClassValidationSchema), updateClass);
router.delete('/:id', requirePermission('classes.delete'), validate(classIdValidationSchema), deleteClass);

export { router as classesRoutes };
