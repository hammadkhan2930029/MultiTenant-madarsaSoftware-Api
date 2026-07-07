import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
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

router.post('/', requirePermission('settings.update'), validate(createQualificationValidationSchema), createQualification);
router.get('/', requirePermission('settings.view'), validate(listQualificationsValidationSchema), getQualifications);
router.get('/:id', requirePermission('settings.view'), validate(qualificationIdValidationSchema), getQualificationById);
router.patch('/:id', requirePermission('settings.update'), validate(updateQualificationValidationSchema), updateQualification);
router.delete('/:id', requirePermission('settings.update'), validate(qualificationIdValidationSchema), deleteQualification);

export { router as qualificationsRoutes };
