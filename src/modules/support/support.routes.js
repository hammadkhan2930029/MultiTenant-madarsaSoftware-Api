import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSupportRequest, getSupportRequests } from './support.controller.js';
import {
  createSupportRequestValidationSchema,
  listSupportRequestsValidationSchema,
} from './support.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('support.create'), validate(createSupportRequestValidationSchema), createSupportRequest);
router.get('/', requirePermission('support.view'), validate(listSupportRequestsValidationSchema), getSupportRequests);

export { router as supportRoutes };
