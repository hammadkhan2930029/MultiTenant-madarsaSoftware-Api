import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createFinancialRecord,
  deleteFinancialRecord,
  getFinancialRecords,
  getFinancialSummary,
  updateFinancialRecord,
} from './financial.controller.js';
import {
  createFinancialValidationSchema,
  financialIdValidationSchema,
  listFinancialValidationSchema,
  updateFinancialValidationSchema,
} from './financial.validation.js';

const router = Router();

router.use(authMiddleware);
router.get('/', validate(listFinancialValidationSchema), getFinancialRecords);
router.get('/summary', validate(listFinancialValidationSchema), getFinancialSummary);
router.post('/', validate(createFinancialValidationSchema), createFinancialRecord);
router.put('/:id', validate(updateFinancialValidationSchema), updateFinancialRecord);
router.delete('/:id', validate(financialIdValidationSchema), deleteFinancialRecord);

export { router as financialRoutes };
