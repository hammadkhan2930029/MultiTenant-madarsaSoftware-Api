import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deactivateSession,
} from './sessions.controller.js';
import {
  createSessionValidationSchema,
  listSessionsValidationSchema,
  sessionIdValidationSchema,
  updateSessionValidationSchema,
} from './sessions.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createSessionValidationSchema), createSession);
router.get('/', validate(listSessionsValidationSchema), getSessions);
router.get('/:id', validate(sessionIdValidationSchema), getSessionById);
router.patch('/:id', validate(updateSessionValidationSchema), updateSession);
router.patch('/:id/deactivate', validate(sessionIdValidationSchema), deactivateSession);

export { router as sessionsRoutes };
