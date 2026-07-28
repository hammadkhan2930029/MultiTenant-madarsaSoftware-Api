import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createExpenseCategory,
  deactivateExpenseCategory,
  getExpenseCategories,
  getExpenseCategoryById,
  updateExpenseCategory,
} from './expenseCategories.controller.js';
import {
  createExpenseCategoryValidationSchema,
  expenseCategoryIdValidationSchema,
  listExpenseCategoriesValidationSchema,
  updateExpenseCategoryValidationSchema,
} from './expenseCategories.validation.js';

const router = Router();

router.use(authMiddleware);
router.post('/', requirePermission('finance.heads.create', 'fees.create'), validate(createExpenseCategoryValidationSchema), createExpenseCategory);
router.get('/', requirePermission('finance.heads.view', 'fees.view'), validate(listExpenseCategoriesValidationSchema), getExpenseCategories);
router.get('/:id', requirePermission('finance.heads.view', 'fees.view'), validate(expenseCategoryIdValidationSchema), getExpenseCategoryById);
router.put('/:id', requirePermission('finance.heads.update', 'fees.update'), validate(updateExpenseCategoryValidationSchema), updateExpenseCategory);
router.patch('/:id/deactivate', requirePermission('finance.heads.delete', 'fees.delete'), validate(expenseCategoryIdValidationSchema), deactivateExpenseCategory);

export { router as expenseCategoriesRoutes };
