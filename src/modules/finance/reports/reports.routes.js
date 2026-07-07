import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
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
router.get('/', requirePermission('reports.view'), validate(financeSummaryReportValidationSchema), getFinanceSummaryReport);
router.get('/student-funds', requirePermission('reports.view'), validate(studentFundHistoryValidationSchema), getStudentFundHistoryReport);
router.get('/teacher-salaries', requirePermission('reports.view'), validate(teacherSalaryHistoryValidationSchema), getTeacherSalaryHistoryReport);

export { router as reportsRoutes };
