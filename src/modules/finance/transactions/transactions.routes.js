import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { financeTransactionProofUpload } from '../../../middlewares/upload.middleware.js';
import {
  createTransaction,
  deactivateTransaction,
  getTransactions,
  printTransaction,
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
router.post('/', requirePermission('finance.transactions.create'), financeTransactionProofUpload.single('paymentProof'), validate(createTransactionValidationSchema), createTransaction);
router.get('/', requirePermission('finance.transactions.view'), validate(listTransactionsValidationSchema), getTransactions);
router.put('/:id', requirePermission('finance.transactions.create'), financeTransactionProofUpload.single('paymentProof'), validate(updateTransactionValidationSchema), updateTransaction);
router.patch('/:id/deactivate', requirePermission('finance.transactions.create'), validate(transactionIdValidationSchema), deactivateTransaction);
router.post('/:id/print', requirePermission('finance.transactions.view'), validate(transactionIdValidationSchema), printTransaction);

export { router as transactionsRoutes };
