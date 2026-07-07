import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createTransaction,
  deactivateTransaction,
  getTransactions,
  updateTransaction,
} from './transactions.controller.js';
import {
  createTransactionValidationSchema,
  listTransactionsValidationSchema,
  transactionIdValidationSchema,
  updateTransactionValidationSchema,
} from './transactions.validation.js';

const router = Router();

router.use(authMiddleware);
router.post('/', requirePermission('fees.create'), validate(createTransactionValidationSchema), createTransaction);
router.get('/', requirePermission('fees.view'), validate(listTransactionsValidationSchema), getTransactions);
router.put('/:id', requirePermission('fees.update'), validate(updateTransactionValidationSchema), updateTransaction);
router.patch('/:id/deactivate', requirePermission('fees.delete'), validate(transactionIdValidationSchema), deactivateTransaction);

export { router as transactionsRoutes };
