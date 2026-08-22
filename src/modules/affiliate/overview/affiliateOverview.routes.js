import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { getAffiliateTenantDetail, listAffiliateOverview } from './affiliateOverview.controller.js';
import { affiliateOverviewDetailSchema, affiliateOverviewListSchema } from './affiliateOverview.validation.js';

const router = Router();
router.use(authMiddleware, requireSuperAdmin);
router.get('/', validate(affiliateOverviewListSchema), listAffiliateOverview);
router.get('/:tenantId', validate(affiliateOverviewDetailSchema), getAffiliateTenantDetail);

export { router as affiliateOverviewRoutes };
