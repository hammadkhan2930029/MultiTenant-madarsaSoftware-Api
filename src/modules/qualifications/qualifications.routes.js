import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../../middlewares/authorization.middleware.js';
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

router.post('/', requireAnyPermission('settings.degrees.create', 'settings.update', 'settings.edit'), validate(createQualificationValidationSchema), createQualification);
router.get('/', requireAnyPermission('settings.degrees.view', 'settings.view'), validate(listQualificationsValidationSchema), getQualifications);
router.get('/:id', requireAnyPermission('settings.degrees.view', 'settings.view'), validate(qualificationIdValidationSchema), getQualificationById);
router.patch('/:id', requireAnyPermission('settings.degrees.update', 'settings.update', 'settings.edit'), validate(updateQualificationValidationSchema), updateQualification);
router.delete('/:id', requireAnyPermission('settings.degrees.delete', 'settings.update', 'settings.edit'), validate(qualificationIdValidationSchema), deleteQualification);

export { router as qualificationsRoutes };
