import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  generateStudentFees,
  getStudentFeeById,
  getStudentFeeHistory,
  getStudentFees,
  saveStudentFeePayment,
} from './studentFees.controller.js';
import {
  generateStudentFeesValidationSchema,
  listStudentFeesValidationSchema,
  saveStudentFeePaymentValidationSchema,
  studentFeeHistoryValidationSchema,
  studentFeeIdValidationSchema,
} from './studentFees.validation.js';

const router = Router();

router.use(authMiddleware);
router.post('/generate', requirePermission('student_fees.create'), validate(generateStudentFeesValidationSchema), generateStudentFees);
router.get('/', requirePermission('student_fees.view', 'student_fees.create', 'student_fees.collect', 'student_fees.history', 'student_fees.edit'), validate(listStudentFeesValidationSchema), getStudentFees);
router.get('/student/:studentId/history', requirePermission('student_fees.history', 'student_fees.view', 'student_fees.collect', 'student_fees.edit'), validate(studentFeeHistoryValidationSchema), getStudentFeeHistory);
router.get('/:id', requirePermission('student_fees.view', 'student_fees.history', 'student_fees.collect', 'student_fees.edit'), validate(studentFeeIdValidationSchema), getStudentFeeById);
router.patch('/:id/payment', requirePermission('student_fees.collect', 'student_fees.edit'), validate(saveStudentFeePaymentValidationSchema), saveStudentFeePayment);

export { router as studentFeesRoutes };
