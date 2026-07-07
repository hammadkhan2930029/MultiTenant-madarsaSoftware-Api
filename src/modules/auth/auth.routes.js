import { Router } from 'express';
import {
  loginAdmin,
  changePassword,
  getCurrentAdminProfile,
  getMadrassaProfile,
  updateMadrassaProfile,
} from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { madrassaProfileImageUpload } from '../../middlewares/upload.middleware.js';
import {
  loginValidationSchema,
  changePasswordValidationSchema,
  currentAdminValidationSchema,
  madrassaProfileValidationSchema,
  updateMadrassaProfileValidationSchema,
} from './auth.validation.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';

const router = Router();

router.post('/login', validate(loginValidationSchema), loginAdmin);
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordValidationSchema),
  changePassword
);
router.get('/me', authMiddleware, validate(currentAdminValidationSchema), getCurrentAdminProfile);
router.get('/profile', authMiddleware, requirePermission('settings.view'), validate(madrassaProfileValidationSchema), getMadrassaProfile);
router.put(
  '/profile',
  authMiddleware,
  requirePermission('settings.update'),
  madrassaProfileImageUpload.single('logo'),
  validate(updateMadrassaProfileValidationSchema),
  updateMadrassaProfile
);

export { router as authRoutes };
