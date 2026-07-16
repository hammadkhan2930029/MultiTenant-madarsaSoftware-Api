import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTenant,
  getTenantBranchList,
  getTenantBranchSummary,
  getTenantById,
  getTenants,
  getTenantsWithBranchSettings,
  updateTenantBranchLimit,
  updateTenantBranchSettings,
  updateTenant,
} from './tenants.controller.js';
import {
  createTenantValidationSchema,
  listTenantBranchesValidationSchema,
  listTenantsValidationSchema,
  tenantIdValidationSchema,
  updateTenantBranchLimitValidationSchema,
  updateTenantBranchSettingsValidationSchema,
  updateTenantValidationSchema,
} from './tenants.validation.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);

router.post('/', validate(createTenantValidationSchema), createTenant);
router.get('/', validate(listTenantsValidationSchema), getTenants);
router.get('/branch-settings', validate(listTenantsValidationSchema), getTenantsWithBranchSettings);
router.get('/:id/branch-summary', validate(tenantIdValidationSchema), getTenantBranchSummary);
router.get('/:id/branches', validate(listTenantBranchesValidationSchema), getTenantBranchList);
router.patch('/:id/branch-settings', validate(updateTenantBranchSettingsValidationSchema), updateTenantBranchSettings);
router.patch('/:id/branch-limit', validate(updateTenantBranchLimitValidationSchema), updateTenantBranchLimit);
router.get('/:id', validate(tenantIdValidationSchema), getTenantById);
router.patch('/:id', validate(updateTenantValidationSchema), updateTenant);

export { router as tenantsRoutes };
