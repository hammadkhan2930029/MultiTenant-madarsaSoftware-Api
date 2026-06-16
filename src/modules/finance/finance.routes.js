import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { headsRoutes } from './heads/heads.routes.js';
import { fundCollectionsRoutes } from './fund-collections/fundCollections.routes.js';
import { salaryRoutes } from './salaries/salaries.routes.js';
import { reportsRoutes } from './reports/reports.routes.js';
import { studentFeesRoutes } from './student-fees/studentFees.routes.js';
import { transactionsRoutes } from './transactions/transactions.routes.js';
import { createExpense, getExpenses } from './transactions/transactions.controller.js';
import { financialRoutes } from './financial/financial.routes.js';

const router = Router();

router.use('/heads', headsRoutes);
router.use('/fund-collections', fundCollectionsRoutes);
router.use('/student-fees', studentFeesRoutes);
router.use('/salaries', salaryRoutes);
router.post('/expenses', authMiddleware, createExpense);
router.get('/expenses', authMiddleware, getExpenses);
router.use('/transactions', transactionsRoutes);
router.use('/financial', financialRoutes);
router.use('/reports', reportsRoutes);

export { router as financeRoutes };
