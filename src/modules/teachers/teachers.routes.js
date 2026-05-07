import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { teacherImageUpload } from '../../middlewares/upload.middleware.js';
import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
} from './teachers.controller.js';
import {
  createTeacherValidationSchema,
  listTeachersValidationSchema,
  teacherIdValidationSchema,
  updateTeacherValidationSchema,
  updateTeacherStatusValidationSchema,
} from './teachers.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', teacherImageUpload.single('image'), validate(createTeacherValidationSchema), createTeacher);
router.get('/', validate(listTeachersValidationSchema), getTeachers);
router.get('/:id', validate(teacherIdValidationSchema), getTeacherById);
router.put('/:id', teacherImageUpload.single('image'), validate(updateTeacherValidationSchema), updateTeacher);
router.patch('/:id/status', validate(updateTeacherStatusValidationSchema), updateTeacherStatus);

export { router as teachersRoutes };
