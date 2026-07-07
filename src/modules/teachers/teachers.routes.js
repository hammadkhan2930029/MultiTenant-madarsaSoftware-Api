import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { teacherImageUpload } from '../../middlewares/upload.middleware.js';
import {
  createTeacher,
  createTeacherIncrement,
  getAllTeacherIncrements,
  getTeachers,
  getTeacherById,
  getTeacherIncrements,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher,
} from './teachers.controller.js';
import {
  createTeacherValidationSchema,
  listTeacherIncrementsValidationSchema,
  listTeachersValidationSchema,
  teacherIdValidationSchema,
  teacherIncrementValidationSchema,
  updateTeacherValidationSchema,
  updateTeacherStatusValidationSchema,
} from './teachers.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('teachers.create'), teacherImageUpload.single('image'), validate(createTeacherValidationSchema), createTeacher);
router.get('/', requirePermission('teachers.view'), validate(listTeachersValidationSchema), getTeachers);
router.get('/increments', requirePermission('teachers.view'), validate(listTeacherIncrementsValidationSchema), getAllTeacherIncrements);
router.get('/:id/increments', requirePermission('teachers.view'), validate(teacherIdValidationSchema), getTeacherIncrements);
router.post('/:id/increments', requirePermission('teachers.update'), validate(teacherIncrementValidationSchema), createTeacherIncrement);
router.get('/:id', requirePermission('teachers.view'), validate(teacherIdValidationSchema), getTeacherById);
router.put('/:id', requirePermission('teachers.update'), teacherImageUpload.single('image'), validate(updateTeacherValidationSchema), updateTeacher);
router.patch('/:id/status', requirePermission('teachers.update'), validate(updateTeacherStatusValidationSchema), updateTeacherStatus);
router.delete('/:id', requirePermission('teachers.delete'), validate(teacherIdValidationSchema), deleteTeacher);

export { router as teachersRoutes };
