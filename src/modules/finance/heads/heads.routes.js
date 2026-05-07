import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createHeadValidationSchema), createHead);
router.get('/', validate(listHeadsValidationSchema), getHeads);
router.get('/:id', validate(headIdValidationSchema), getHeadById);
router.put('/:id', validate(updateHeadValidationSchema), updateHead);
router.patch('/:id/deactivate', validate(headIdValidationSchema), deactivateHead);

export { router as headsRoutes };
