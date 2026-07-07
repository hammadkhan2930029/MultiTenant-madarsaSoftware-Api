import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
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
router.get('/', requirePermission('fees.view'), validate(listFinancialValidationSchema), getFinancialRecords);
router.get('/summary', requirePermission('fees.view'), validate(listFinancialValidationSchema), getFinancialSummary);
router.post('/', requirePermission('fees.create'), validate(createFinancialValidationSchema), createFinancialRecord);
router.put('/:id', requirePermission('fees.update'), validate(updateFinancialValidationSchema), updateFinancialRecord);
router.delete('/:id', requirePermission('fees.delete'), validate(financialIdValidationSchema), deleteFinancialRecord);

export { router as financialRoutes };
