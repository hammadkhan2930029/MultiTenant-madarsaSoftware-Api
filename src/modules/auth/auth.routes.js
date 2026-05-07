import { Router } from 'express';
import { loginAdmin, changePassword, getCurrentAdminProfile } from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  loginValidationSchema,
  changePasswordValidationSchema,
  currentAdminValidationSchema,
} from './auth.validation.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', validate(loginValidationSchema), loginAdmin);
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordValidationSchema),
  changePassword
);
router.get('/me', authMiddleware, validate(currentAdminValidationSchema), getCurrentAdminProfile);

export { router as authRoutes };
