import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createResultGradeValidationSchema), createResultGrade);
router.get('/', validate(listResultGradesValidationSchema), getResultGrades);
router.get('/:id', validate(resultGradeIdValidationSchema), getResultGradeById);
router.put('/:id', validate(updateResultGradeValidationSchema), updateResultGrade);
router.delete('/:id', validate(resultGradeIdValidationSchema), deleteResultGrade);

export { router as resultGradesRoutes };
