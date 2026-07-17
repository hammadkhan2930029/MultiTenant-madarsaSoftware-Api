import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createTeacherAssignments,
  deleteTeacherAssignment,
  getResponsibilities,
  getTeacherAssignmentById,
  getTeacherAssignments,
  updateTeacherAssignment,
  updateTeacherAssignmentStatus,
} from './teacher-assignments.controller.js';
import {
  createTeacherAssignmentValidationSchema,
  listResponsibilitiesValidationSchema,
  listTeacherAssignmentsValidationSchema,
  teacherAssignmentIdValidationSchema,
  updateTeacherAssignmentStatusValidationSchema,
  updateTeacherAssignmentValidationSchema,
} from './teacher-assignments.validation.js';

const router = Router();

router.use(authMiddleware);

router.get('/responsibilities', requirePermission('teachers.assignments.view'), validate(listResponsibilitiesValidationSchema), getResponsibilities);
router.get('/', requirePermission('teachers.assignments.view'), validate(listTeacherAssignmentsValidationSchema), getTeacherAssignments);
router.post('/', requirePermission('teachers.assignments.create'), validate(createTeacherAssignmentValidationSchema), createTeacherAssignments);
router.get('/:id', requirePermission('teachers.assignments.view'), validate(teacherAssignmentIdValidationSchema), getTeacherAssignmentById);
router.patch('/:id', requirePermission('teachers.assignments.edit'), validate(updateTeacherAssignmentValidationSchema), updateTeacherAssignment);
router.patch('/:id/status', requirePermission('teachers.assignments.edit'), validate(updateTeacherAssignmentStatusValidationSchema), updateTeacherAssignmentStatus);
router.delete('/:id', requirePermission('teachers.assignments.delete'), validate(teacherAssignmentIdValidationSchema), deleteTeacherAssignment);

export { router as teacherAssignmentsRoutes };
