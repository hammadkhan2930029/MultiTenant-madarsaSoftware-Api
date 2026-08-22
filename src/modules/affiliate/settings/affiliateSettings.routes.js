import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { getAffiliateSettings, updateAffiliateSettings } from './affiliateSettings.controller.js';
import { getAffiliateSettingsValidationSchema, updateAffiliateSettingsValidationSchema } from './affiliateSettings.validation.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);
router.get('/', validate(getAffiliateSettingsValidationSchema), getAffiliateSettings);
router.put('/', validate(updateAffiliateSettingsValidationSchema), updateAffiliateSettings);

export { router as affiliateSettingsRoutes };
