import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deactivateClass,
} from './classes.controller.js';
import {
  createClassValidationSchema,
  listClassesValidationSchema,
  classIdValidationSchema,
  updateClassValidationSchema,
} from './classes.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createClassValidationSchema), createClass);
router.get('/', validate(listClassesValidationSchema), getClasses);
router.get('/:id', validate(classIdValidationSchema), getClassById);
router.patch('/:id', validate(updateClassValidationSchema), updateClass);
router.patch('/:id/deactivate', validate(classIdValidationSchema), deactivateClass);

export { router as classesRoutes };
