import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission, requireResourceRead } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { studentAdmissionUpload } from '../../middlewares/upload.middleware.js';
import { parseJsonFields } from '../../middlewares/parseJsonFields.middleware.js';
import {
  createStudent,
  getStudents,
  getNextAdmissionNumber,
  getStudentById,
  updateStudent,
  deleteStudent,
  deleteStudentDocument,
  getStudentDocumentFile,
  assignClassToStudent,
  removeClassAssignment,
} from './students.controller.js';
import {
  createStudentValidationSchema,
  listStudentsValidationSchema,
  studentIdValidationSchema,
  updateStudentValidationSchema,
  studentDocumentIdValidationSchema,
  assignStudentClassValidationSchema,
  classAssignmentIdValidationSchema,
} from './students.validation.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  requirePermission('students.create'),
  studentAdmissionUpload,
  parseJsonFields(['parents']),
  validate(createStudentValidationSchema),
  createStudent
);
router.get('/', requireResourceRead('students', 'students.view'), validate(listStudentsValidationSchema), getStudents);
router.get('/next-admission-number', requireResourceRead('students', 'students.view'), getNextAdmissionNumber);
router.get('/:id', requireResourceRead('students', 'students.view'), validate(studentIdValidationSchema), getStudentById);
router.put(
  '/:id',
  requirePermission('students.edit'),
  studentAdmissionUpload,
  parseJsonFields(['parents']),
  validate(updateStudentValidationSchema),
  updateStudent
);
router.get(
  '/:id/documents/:documentId/file',
  requireResourceRead('students', 'students.view'),
  validate(studentDocumentIdValidationSchema),
  getStudentDocumentFile
);
router.delete(
  '/:id/documents/:documentId',
  requirePermission('students.edit'),
  validate(studentDocumentIdValidationSchema),
  deleteStudentDocument
);
router.delete('/:id', requirePermission('students.delete'), validate(studentIdValidationSchema), deleteStudent);
router.post('/:id/assign-class', requirePermission('students.edit'), validate(assignStudentClassValidationSchema), assignClassToStudent);
router.patch(
  '/class-assignments/:assignmentId/remove',
  requirePermission('students.edit'),
  validate(classAssignmentIdValidationSchema),
  removeClassAssignment
);

export { router as studentsRoutes };
