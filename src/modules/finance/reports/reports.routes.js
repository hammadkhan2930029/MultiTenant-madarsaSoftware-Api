import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  getFinanceSummaryReport,
  getStudentFundHistoryReport,
  getTeacherSalaryHistoryReport,
} from './reports.controller.js';
import {
  financeSummaryReportValidationSchema,
  studentFundHistoryValidationSchema,
  teacherSalaryHistoryValidationSchema,
} from './reports.validation.js';

const router = Router();
router.use(authMiddleware);
router.get('/', validate(financeSummaryReportValidationSchema), getFinanceSummaryReport);
router.get('/student-funds', validate(studentFundHistoryValidationSchema), getStudentFundHistoryReport);
router.get('/teacher-salaries', validate(teacherSalaryHistoryValidationSchema), getTeacherSalaryHistoryReport);

export { router as reportsRoutes };
