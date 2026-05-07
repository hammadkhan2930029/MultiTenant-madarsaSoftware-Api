import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  deactivateBranch,
} from './branches.controller.js';
import {
  createBranchValidationSchema,
  listBranchesValidationSchema,
  branchIdValidationSchema,
  updateBranchValidationSchema,
} from './branches.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createBranchValidationSchema), createBranch);
router.get('/', validate(listBranchesValidationSchema), getBranches);
router.get('/:id', validate(branchIdValidationSchema), getBranchById);
router.patch('/:id', validate(updateBranchValidationSchema), updateBranch);
router.patch('/:id/deactivate', validate(branchIdValidationSchema), deactivateBranch);

export { router as branchesRoutes };
