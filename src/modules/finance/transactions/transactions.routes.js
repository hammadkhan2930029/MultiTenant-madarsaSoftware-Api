import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createTransactionValidationSchema), createTransaction);
router.get('/', validate(listTransactionsValidationSchema), getTransactions);
router.put('/:id', validate(updateTransactionValidationSchema), updateTransaction);
router.patch('/:id/deactivate', validate(transactionIdValidationSchema), deactivateTransaction);

export { router as transactionsRoutes };
