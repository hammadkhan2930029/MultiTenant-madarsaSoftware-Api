import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { AppError } from '../../utils/appError.js';
import {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getLegacyMigrationSummary,
  getLegacyMigrationPreview,
  getLegacyMigrationStatus,
  migrateLegacyDataToMainBranch,
  executeLegacyMigration,
} from './branches.controller.js';
import {
  createBranchValidationSchema,
  listBranchesValidationSchema,
  branchIdValidationSchema,
  updateBranchValidationSchema,
  legacyMigrationSummaryValidationSchema,
  legacyMigrationPreviewValidationSchema,
  legacyMigrationStatusValidationSchema,
  legacyMigrationValidationSchema,
} from './branches.validation.js';

const router = Router();

router.use(authMiddleware);

const requireTenantAdminBranchLookup = (req, _res, next) => {
  if (req.auth?.isTenantAdmin) return next();

  return next(new AppError('یہ عمل صرف مدرسہ ایڈمن کر سکتا ہے۔', 403));
};

router.use(requireTenantAdminBranchLookup);

router.post('/', requirePermission('branches.create'), validate(createBranchValidationSchema), createBranch);
router.get('/', requirePermission('branches.view'), validate(listBranchesValidationSchema), getBranches);
router.get('/legacy-migration/status', requirePermission('branches.view'), validate(legacyMigrationStatusValidationSchema), getLegacyMigrationStatus);
router.get('/legacy-migration/preview', requirePermission('branches.view'), validate(legacyMigrationPreviewValidationSchema), getLegacyMigrationPreview);
router.get('/legacy-migration/summary', requirePermission('branches.view'), validate(legacyMigrationSummaryValidationSchema), getLegacyMigrationSummary);
router.post('/legacy-migration/execute', requirePermission('branches.create'), validate(legacyMigrationValidationSchema), executeLegacyMigration);
router.post('/legacy-migration/main-branch', requirePermission('branches.create'), validate(legacyMigrationValidationSchema), migrateLegacyDataToMainBranch);
router.get('/:id', requirePermission('branches.view'), validate(branchIdValidationSchema), getBranchById);
router.patch('/:id', requirePermission('branches.update'), validate(updateBranchValidationSchema), updateBranch);
router.delete('/:id', requirePermission('branches.delete'), validate(branchIdValidationSchema), deleteBranch);

export { router as branchesRoutes };
