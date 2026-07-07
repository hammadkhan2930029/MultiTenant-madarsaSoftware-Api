import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createSalaryEntry,
  getSalaryEntries,
  getSalaryEntryById,
  updateSalaryEntry,
  deactivateSalaryEntry,
} from './salaries.controller.js';
import {
  createSalaryValidationSchema,
  listSalariesValidationSchema,
  salaryIdValidationSchema,
  updateSalaryValidationSchema,
} from './salaries.validation.js';

const router = Router();
router.use(authMiddleware);
router.post('/', requirePermission('fees.create'), validate(createSalaryValidationSchema), createSalaryEntry);
router.get('/', requirePermission('fees.view'), validate(listSalariesValidationSchema), getSalaryEntries);
router.get('/:id', requirePermission('fees.view'), validate(salaryIdValidationSchema), getSalaryEntryById);
router.put('/:id', requirePermission('fees.update'), validate(updateSalaryValidationSchema), updateSalaryEntry);
router.patch('/:id/deactivate', requirePermission('fees.delete'), validate(salaryIdValidationSchema), deactivateSalaryEntry);

export { router as salaryRoutes };
