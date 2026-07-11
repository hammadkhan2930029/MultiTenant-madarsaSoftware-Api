import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
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

router.post('/', requirePermission('exam_results.create'), validate(saveExamResultValidationSchema), saveExamResult);
router.get('/', requirePermission('exam_results.view'), validate(listExamResultsValidationSchema), getExamResults);
router.get('/student/:studentId', requirePermission('exam_results.view'), validate(findStudentExamResultValidationSchema), findStudentExamResult);
router.get('/:id', requirePermission('exam_results.view'), validate(examResultIdValidationSchema), getExamResultById);
router.put('/:id', requirePermission('exam_results.create'), validate(updateExamResultValidationSchema), updateExamResult);
router.delete('/:id', requirePermission('exams.delete'), validate(examResultIdValidationSchema), deleteExamResult);

export { router as examResultsRoutes };
