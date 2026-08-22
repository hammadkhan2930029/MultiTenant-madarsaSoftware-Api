import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../../middlewares/authorization.middleware.js';
import { previewCommissionReconciliation, runCommissionReconciliation } from './commissionReconciliation.controller.js';
const router = Router();
router.use(authMiddleware, requireSuperAdmin);
router.get('/preview', previewCommissionReconciliation);
router.post('/run', runCommissionReconciliation);
export { router as commissionReconciliationRoutes };
