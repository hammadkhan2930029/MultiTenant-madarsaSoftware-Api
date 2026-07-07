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
router.post('/generate', requirePermission('fees.create'), validate(generateStudentFeesValidationSchema), generateStudentFees);
router.get('/', requirePermission('fees.view'), validate(listStudentFeesValidationSchema), getStudentFees);
router.get('/student/:studentId/history', requirePermission('fees.view'), validate(studentFeeHistoryValidationSchema), getStudentFeeHistory);
router.get('/:id', requirePermission('fees.view'), validate(studentFeeIdValidationSchema), getStudentFeeById);
router.patch('/:id/payment', requirePermission('fees.create'), validate(saveStudentFeePaymentValidationSchema), saveStudentFeePayment);

export { router as studentFeesRoutes };
