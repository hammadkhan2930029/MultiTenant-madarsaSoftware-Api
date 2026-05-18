import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createSubject,
  deleteSubject,
  getSubjectById,
  getSubjects,
  updateSubject,
} from './subjects.controller.js';
import {
  createSubjectValidationSchema,
  listSubjectsValidationSchema,
  subjectIdValidationSchema,
  updateSubjectValidationSchema,
} from './subjects.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createSubjectValidationSchema), createSubject);
router.get('/', validate(listSubjectsValidationSchema), getSubjects);
router.get('/:id', validate(subjectIdValidationSchema), getSubjectById);
router.patch('/:id', validate(updateSubjectValidationSchema), updateSubject);
router.delete('/:id', validate(subjectIdValidationSchema), deleteSubject);

export { router as subjectsRoutes };
