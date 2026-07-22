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
router.post('/', requirePermission('fees.create'), validate(createExpenseCategoryValidationSchema), createExpenseCategory);
router.get('/', requirePermission('fees.view'), validate(listExpenseCategoriesValidationSchema), getExpenseCategories);
router.get('/:id', requirePermission('fees.view'), validate(expenseCategoryIdValidationSchema), getExpenseCategoryById);
router.put('/:id', requirePermission('fees.update'), validate(updateExpenseCategoryValidationSchema), updateExpenseCategory);
router.patch('/:id/deactivate', requirePermission('fees.delete'), validate(expenseCategoryIdValidationSchema), deactivateExpenseCategory);

export { router as expenseCategoriesRoutes };
