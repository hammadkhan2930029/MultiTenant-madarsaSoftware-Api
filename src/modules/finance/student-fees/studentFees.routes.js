import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/generate', validate(generateStudentFeesValidationSchema), generateStudentFees);
router.get('/', validate(listStudentFeesValidationSchema), getStudentFees);
router.get('/student/:studentId/history', validate(studentFeeHistoryValidationSchema), getStudentFeeHistory);
router.get('/:id', validate(studentFeeIdValidationSchema), getStudentFeeById);
router.patch('/:id/payment', validate(saveStudentFeePaymentValidationSchema), saveStudentFeePayment);

export { router as studentFeesRoutes };
