import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSupportRequest, getSupportRequests } from './support.controller.js';
import {
  createSupportRequestValidationSchema,
  listSupportRequestsValidationSchema,
} from './support.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createSupportRequestValidationSchema), createSupportRequest);
router.get('/', validate(listSupportRequestsValidationSchema), getSupportRequests);

export { router as supportRoutes };
