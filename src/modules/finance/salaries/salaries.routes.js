import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createSalaryValidationSchema), createSalaryEntry);
router.get('/', validate(listSalariesValidationSchema), getSalaryEntries);
router.get('/:id', validate(salaryIdValidationSchema), getSalaryEntryById);
router.put('/:id', validate(updateSalaryValidationSchema), updateSalaryEntry);
router.patch('/:id/deactivate', validate(salaryIdValidationSchema), deactivateSalaryEntry);

export { router as salaryRoutes };
