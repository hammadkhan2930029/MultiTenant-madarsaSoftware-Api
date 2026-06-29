import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTenant,
  getTenantById,
  getTenants,
  updateTenant,
} from './tenants.controller.js';
import {
  createTenantValidationSchema,
  listTenantsValidationSchema,
  tenantIdValidationSchema,
  updateTenantValidationSchema,
} from './tenants.validation.js';

const router = Router();

router.use(authMiddleware, requireSuperAdmin);

router.post('/', validate(createTenantValidationSchema), createTenant);
router.get('/', validate(listTenantsValidationSchema), getTenants);
router.get('/:id', validate(tenantIdValidationSchema), getTenantById);
router.patch('/:id', validate(updateTenantValidationSchema), updateTenant);

export { router as tenantsRoutes };
