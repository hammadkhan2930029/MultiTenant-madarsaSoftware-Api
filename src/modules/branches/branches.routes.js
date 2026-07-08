import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
} from './branches.controller.js';
import {
  createBranchValidationSchema,
  listBranchesValidationSchema,
  branchIdValidationSchema,
  updateBranchValidationSchema,
} from './branches.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('branches.create'), validate(createBranchValidationSchema), createBranch);
router.get('/', requirePermission('branches.view'), validate(listBranchesValidationSchema), getBranches);
router.get('/:id', requirePermission('branches.view'), validate(branchIdValidationSchema), getBranchById);
router.patch('/:id', requirePermission('branches.update'), validate(updateBranchValidationSchema), updateBranch);
router.delete('/:id', requirePermission('branches.delete'), validate(branchIdValidationSchema), deleteBranch);

export { router as branchesRoutes };
