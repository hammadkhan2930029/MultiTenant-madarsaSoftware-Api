import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { getAuditLogs } from './auditLogs.controller.js';
import { listAuditLogsValidationSchema } from './auditLogs.validation.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('audit.view'), validate(listAuditLogsValidationSchema), getAuditLogs);

export { router as auditLogsRoutes };
