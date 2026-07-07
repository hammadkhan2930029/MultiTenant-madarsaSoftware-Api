import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { studentImageUpload } from '../../middlewares/upload.middleware.js';
import { parseJsonFields } from '../../middlewares/parseJsonFields.middleware.js';
import {
  createStudent,
  getStudents,
  getNextAdmissionNumber,
  getStudentById,
  updateStudent,
  deleteStudent,
  assignClassToStudent,
  removeClassAssignment,
} from './students.controller.js';
import {
  createStudentValidationSchema,
  listStudentsValidationSchema,
  studentIdValidationSchema,
  updateStudentValidationSchema,
  assignStudentClassValidationSchema,
  classAssignmentIdValidationSchema,
} from './students.validation.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  requirePermission('students.create'),
  studentImageUpload.single('image'),
  parseJsonFields(['parents']),
  validate(createStudentValidationSchema),
  createStudent
);
router.get('/', requirePermission('students.view'), validate(listStudentsValidationSchema), getStudents);
router.get('/next-admission-number', requirePermission('students.view'), getNextAdmissionNumber);
router.get('/:id', requirePermission('students.view'), validate(studentIdValidationSchema), getStudentById);
router.put(
  '/:id',
  requirePermission('students.update'),
  studentImageUpload.single('image'),
  parseJsonFields(['parents']),
  validate(updateStudentValidationSchema),
  updateStudent
);
router.delete('/:id', requirePermission('students.delete'), validate(studentIdValidationSchema), deleteStudent);
router.post('/:id/assign-class', requirePermission('students.update'), validate(assignStudentClassValidationSchema), assignClassToStudent);
router.patch(
  '/class-assignments/:assignmentId/remove',
  requirePermission('students.update'),
  validate(classAssignmentIdValidationSchema),
  removeClassAssignment
);

export { router as studentsRoutes };
