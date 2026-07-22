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
router.post('/', requirePermission('salary.create'), validate(createSalaryValidationSchema), createSalaryEntry);
router.get('/', requirePermission('salary.view'), validate(listSalariesValidationSchema), getSalaryEntries);
router.get('/:id', requirePermission('salary.view'), validate(salaryIdValidationSchema), getSalaryEntryById);
router.put('/:id', requirePermission('salary.edit'), validate(updateSalaryValidationSchema), updateSalaryEntry);
router.patch('/:id/deactivate', requirePermission('salary.delete'), validate(salaryIdValidationSchema), deactivateSalaryEntry);

export { router as salaryRoutes };
