import { Router } from 'express';
import { headsRoutes } from './heads/heads.routes.js';
import { fundCollectionsRoutes } from './fund-collections/fundCollections.routes.js';
import { salaryRoutes } from './salaries/salaries.routes.js';
import { reportsRoutes } from './reports/reports.routes.js';
import { studentFeesRoutes } from './student-fees/studentFees.routes.js';

const router = Router();

router.use('/heads', headsRoutes);
router.use('/fund-collections', fundCollectionsRoutes);
router.use('/student-fees', studentFeesRoutes);
router.use('/salaries', salaryRoutes);
router.use('/reports', reportsRoutes);

export { router as financeRoutes };
