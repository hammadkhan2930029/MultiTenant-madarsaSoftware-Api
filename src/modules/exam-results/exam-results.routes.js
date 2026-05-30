import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  deleteExamResult,
  findStudentExamResult,
  getExamResultById,
  getExamResults,
  saveExamResult,
  updateExamResult,
} from './exam-results.controller.js';
import {
  examResultIdValidationSchema,
  findStudentExamResultValidationSchema,
  listExamResultsValidationSchema,
  saveExamResultValidationSchema,
  updateExamResultValidationSchema,
} from './exam-results.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(saveExamResultValidationSchema), saveExamResult);
router.get('/', validate(listExamResultsValidationSchema), getExamResults);
router.get('/student/:studentId', validate(findStudentExamResultValidationSchema), findStudentExamResult);
router.get('/:id', validate(examResultIdValidationSchema), getExamResultById);
router.put('/:id', validate(updateExamResultValidationSchema), updateExamResult);
router.delete('/:id', validate(examResultIdValidationSchema), deleteExamResult);

export { router as examResultsRoutes };
