import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
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

router.post('/', requirePermission('subjects.create'), validate(createSubjectValidationSchema), createSubject);
router.get('/', requirePermission('subjects.view'), validate(listSubjectsValidationSchema), getSubjects);
router.get('/:id', requirePermission('subjects.view'), validate(subjectIdValidationSchema), getSubjectById);
router.patch('/:id', requirePermission('subjects.edit'), validate(updateSubjectValidationSchema), updateSubject);
router.delete('/:id', requirePermission('subjects.delete'), validate(subjectIdValidationSchema), deleteSubject);

export { router as subjectsRoutes };
