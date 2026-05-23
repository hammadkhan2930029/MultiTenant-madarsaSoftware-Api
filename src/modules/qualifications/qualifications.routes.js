import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createQualification,
  deleteQualification,
  getQualificationById,
  getQualifications,
  updateQualification,
} from './qualifications.controller.js';
import {
  createQualificationValidationSchema,
  listQualificationsValidationSchema,
  qualificationIdValidationSchema,
  updateQualificationValidationSchema,
} from './qualifications.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createQualificationValidationSchema), createQualification);
router.get('/', validate(listQualificationsValidationSchema), getQualifications);
router.get('/:id', validate(qualificationIdValidationSchema), getQualificationById);
router.patch('/:id', validate(updateQualificationValidationSchema), updateQualification);
router.delete('/:id', validate(qualificationIdValidationSchema), deleteQualification);

export { router as qualificationsRoutes };
