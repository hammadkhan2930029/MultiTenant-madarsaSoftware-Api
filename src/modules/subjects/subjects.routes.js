import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission, requireResourceRead } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  bulkCreateSubjects,
  createSubject,
  deleteSubject,
  getSubjectById,
  getSubjects,
  updateSubject,
} from './subjects.controller.js';
import {
  bulkCreateSubjectsValidationSchema,
  createSubjectValidationSchema,
  listSubjectsValidationSchema,
  subjectIdValidationSchema,
  updateSubjectValidationSchema,
} from './subjects.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('subjects.create'), validate(createSubjectValidationSchema), createSubject);
router.post('/bulk', requirePermission('subjects.create'), validate(bulkCreateSubjectsValidationSchema), bulkCreateSubjects);
router.get('/', requireResourceRead('subjects', 'subjects.view'), validate(listSubjectsValidationSchema), getSubjects);
router.get('/:id', requireResourceRead('subjects', 'subjects.view'), validate(subjectIdValidationSchema), getSubjectById);
router.patch('/:id', requirePermission('subjects.edit'), validate(updateSubjectValidationSchema), updateSubject);
router.delete('/:id', requirePermission('subjects.delete'), validate(subjectIdValidationSchema), deleteSubject);

export { router as subjectsRoutes };
