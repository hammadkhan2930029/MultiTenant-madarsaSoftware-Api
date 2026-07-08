import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createResultGrade,
  deleteResultGrade,
  getResultGradeById,
  getResultGrades,
  updateResultGrade,
} from './result-grades.controller.js';
import {
  createResultGradeValidationSchema,
  listResultGradesValidationSchema,
  resultGradeIdValidationSchema,
  updateResultGradeValidationSchema,
} from './result-grades.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('exams.create'), validate(createResultGradeValidationSchema), createResultGrade);
router.get('/', requirePermission('exams.view'), validate(listResultGradesValidationSchema), getResultGrades);
router.get('/:id', requirePermission('exams.view'), validate(resultGradeIdValidationSchema), getResultGradeById);
router.put('/:id', requirePermission('exams.update'), validate(updateResultGradeValidationSchema), updateResultGrade);
router.delete('/:id', requirePermission('exams.delete'), validate(resultGradeIdValidationSchema), deleteResultGrade);

export { router as resultGradesRoutes };
