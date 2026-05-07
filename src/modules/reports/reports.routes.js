import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.get('/students', validate(studentsReportValidationSchema), getStudentsReport);
router.get('/attendance', validate(attendanceReportValidationSchema), getAttendanceReport);
router.get('/hifz-progress', validate(hifzProgressReportValidationSchema), getHifzProgressReport);
router.get('/fund-collections', validate(fundCollectionsReportValidationSchema), getFundCollectionsReport);
router.get('/salaries', validate(salaryReportValidationSchema), getSalaryReport);
router.get('/monthly-finance-summary', validate(monthlyFinanceSummaryValidationSchema), getMonthlyFinanceSummaryReport);

export { router as reportsRoutes };
