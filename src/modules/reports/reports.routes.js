import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  getStudentsReport,
  getAttendanceReport,
  getHifzProgressReport,
  getFundCollectionsReport,
  getSalaryReport,
  getMonthlyFinanceSummaryReport,
} from './reports.controller.js';
import {
  studentsReportValidationSchema,
  attendanceReportValidationSchema,
  hifzProgressReportValidationSchema,
  fundCollectionsReportValidationSchema,
  salaryReportValidationSchema,
  monthlyFinanceSummaryValidationSchema,
} from './reports.validation.js';

const router = Router();

router.use(authMiddleware);

router.get('/students', requirePermission('reports.view'), validate(studentsReportValidationSchema), getStudentsReport);
router.get('/attendance', requirePermission('reports.view'), validate(attendanceReportValidationSchema), getAttendanceReport);
router.get('/hifz-progress', requirePermission('reports.view'), validate(hifzProgressReportValidationSchema), getHifzProgressReport);
router.get('/fund-collections', requirePermission('reports.view'), validate(fundCollectionsReportValidationSchema), getFundCollectionsReport);
router.get('/salaries', requirePermission('reports.view'), validate(salaryReportValidationSchema), getSalaryReport);
router.get('/monthly-finance-summary', requirePermission('reports.view'), validate(monthlyFinanceSummaryValidationSchema), getMonthlyFinanceSummaryReport);

export { router as reportsRoutes };
