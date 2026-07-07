import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from './sessions.controller.js';
import {
  createSessionValidationSchema,
  listSessionsValidationSchema,
  sessionIdValidationSchema,
  updateSessionValidationSchema,
} from './sessions.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('settings.update'), validate(createSessionValidationSchema), createSession);
router.get('/', requirePermission('settings.view'), validate(listSessionsValidationSchema), getSessions);
router.get('/:id', requirePermission('settings.view'), validate(sessionIdValidationSchema), getSessionById);
router.patch('/:id', requirePermission('settings.update'), validate(updateSessionValidationSchema), updateSession);
router.delete('/:id', requirePermission('settings.update'), validate(sessionIdValidationSchema), deleteSession);

export { router as sessionsRoutes };
