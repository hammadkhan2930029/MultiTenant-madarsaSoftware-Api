import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { studentImageUpload } from '../../middlewares/upload.middleware.js';
import { parseJsonFields } from '../../middlewares/parseJsonFields.middleware.js';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  assignClassToStudent,
} from './students.controller.js';
import {
  createStudentValidationSchema,
  listStudentsValidationSchema,
  studentIdValidationSchema,
  updateStudentValidationSchema,
  assignStudentClassValidationSchema,
} from './students.validation.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  studentImageUpload.single('image'),
  parseJsonFields(['parents']),
  validate(createStudentValidationSchema),
  createStudent
);
router.get('/', validate(listStudentsValidationSchema), getStudents);
router.get('/:id', validate(studentIdValidationSchema), getStudentById);
router.put(
  '/:id',
  studentImageUpload.single('image'),
  parseJsonFields(['parents']),
  validate(updateStudentValidationSchema),
  updateStudent
);
router.post('/:id/assign-class', validate(assignStudentClassValidationSchema), assignClassToStudent);

export { router as studentsRoutes };
