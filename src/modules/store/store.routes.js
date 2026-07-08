import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { parseJsonFields } from '../../middlewares/parseJsonFields.middleware.js';
import { storeInvoiceImageUpload, storeIssueSignatureUpload } from '../../middlewares/upload.middleware.js';
import {
  approveStoreApproval,
  approveStoreDamagedStock,
  approveStoreStockIssue,
  createStoreCategory,
  createStoreReturn,
  createStoreDamagedStock,
  createStoreSupplier,
  createStoreSupplierPayment,
  createStorePurchase,
  createStoreItem,
  createStoreStockIssue,
  createStoreUnit,
  deleteStoreCategory,
  deleteStoreItem,
  deleteStorePurchase,
  deleteStoreDamagedStock,
  deleteStoreReturn,
  deleteStoreSupplier,
  deleteStoreStockIssue,
  deleteStoreUnit,
  exportStorePurchasesExcel,
  exportStorePurchasesPdf,
  exportStoreStockReportExcel,
  exportStoreStockReportPdf,
  getStoreDashboard,
  getStoreApprovals,
  getStoreCategories,
  getStoreCategoryById,
  getStoreDamagedStock,
  getStoreDamagedStockById,
  getStoreDailyStockReport,
  getStoreDamagedStockReport,
  getStoreDepartmentWiseReport,
  getStoreItemById,
  getStoreItemLedgerReport,
  getStoreItems,
  getStoreLowStockReport,
  getStoreMonthlyStockReport,
  getStoreMonthlyExpense,
  getStorePurchaseById,
  getStorePurchaseReport,
  getStorePurchases,
  getStoreReturnById,
  getStoreReturns,
  getStoreStockIssueReport,
  getStoreValueReport,
  getStoreSuppliers,
  getStoreSupplierReport,
  getStoreStockIssueById,
  getStoreStockIssues,
  getStoreSupplierById,
  getStoreSupplierPayments,
  getStoreSupplierPurchases,
  getStoreUnitById,
  getStoreUnits,
  printStoreInvoice,
  printStoreIssueSlip,
  rejectStoreApproval,
  rejectStoreStockIssue,
  rejectStoreDamagedStock,
  updateStoreCategory,
  updateStoreSupplier,
  updateStorePurchase,
  updateStoreItem,
  updateStoreStockIssue,
  updateStoreUnit,
} from './store.controller.js';

const router = Router();
const storeView = requirePermission('store.view');
const storeCreate = requirePermission('store.create');
const storeUpdate = requirePermission('store.update');
const storeDelete = requirePermission('store.delete');
const storeApprove = requirePermission('store.approve');
const storeExport = requirePermission('store.export');
const storePrint = requirePermission('store.print');
const storeReports = requirePermission('store.reports');

router.use(authMiddleware);

router.get('/dashboard', storeView, getStoreDashboard);
router.get('/monthly-expense', storeView, getStoreMonthlyExpense);
router.get('/approvals', storeApprove, getStoreApprovals);
router.get('/units', storeView, getStoreUnits);
router.post('/units', storeCreate, createStoreUnit);
router.get('/units/:id', storeView, getStoreUnitById);
router.put('/units/:id', storeUpdate, updateStoreUnit);
router.delete('/units/:id', storeDelete, deleteStoreUnit);
router.get('/categories', storeView, getStoreCategories);
router.post('/categories', storeCreate, createStoreCategory);
router.get('/categories/:id', storeView, getStoreCategoryById);
router.put('/categories/:id', storeUpdate, updateStoreCategory);
router.delete('/categories/:id', storeDelete, deleteStoreCategory);
router.patch('/approvals/:moduleType/:id/approve', storeApprove, approveStoreApproval);
router.patch('/approvals/:moduleType/:id/reject', storeApprove, rejectStoreApproval);
router.get('/export/purchases/pdf', storeExport, exportStorePurchasesPdf);
router.get('/export/purchases/excel', storeExport, exportStorePurchasesExcel);
router.get('/export/stock-report/pdf', storeExport, exportStoreStockReportPdf);
router.get('/export/stock-report/excel', storeExport, exportStoreStockReportExcel);
router.get('/print/invoice/:purchaseId', storePrint, printStoreInvoice);
router.get('/print/issue-slip/:issueId', storePrint, printStoreIssueSlip);
router.get('/reports/daily-stock', storeReports, getStoreDailyStockReport);
router.get('/reports/monthly-stock', storeReports, getStoreMonthlyStockReport);
router.get('/reports/purchases', storeReports, getStorePurchaseReport);
router.get('/reports/suppliers', storeReports, getStoreSupplierReport);
router.get('/reports/stock-issues', storeReports, getStoreStockIssueReport);
router.get('/reports/department-wise', storeReports, getStoreDepartmentWiseReport);
router.get('/reports/low-stock', storeReports, getStoreLowStockReport);
router.get('/reports/damaged-stock', storeReports, getStoreDamagedStockReport);
router.get('/reports/store-value', storeReports, getStoreValueReport);
router.get('/reports/item-ledger/:itemId', storeReports, getStoreItemLedgerReport);
router.get('/items', storeView, getStoreItems);
router.post('/items', storeCreate, createStoreItem);
router.get('/items/:id', storeView, getStoreItemById);
router.put('/items/:id', storeUpdate, updateStoreItem);
router.delete('/items/:id', storeDelete, deleteStoreItem);
router.get('/purchases', storeView, getStorePurchases);
router.post('/purchases', storeCreate, storeInvoiceImageUpload.single('invoiceImage'), parseJsonFields(['items']), createStorePurchase);
router.get('/purchases/:id', storeView, getStorePurchaseById);
router.put('/purchases/:id', storeUpdate, storeInvoiceImageUpload.single('invoiceImage'), parseJsonFields(['items']), updateStorePurchase);
router.delete('/purchases/:id', storeDelete, deleteStorePurchase);
router.get('/suppliers', storeView, getStoreSuppliers);
router.post('/suppliers', storeCreate, createStoreSupplier);
router.get('/suppliers/:id', storeView, getStoreSupplierById);
router.put('/suppliers/:id', storeUpdate, updateStoreSupplier);
router.delete('/suppliers/:id', storeDelete, deleteStoreSupplier);
router.get('/suppliers/:id/purchases', storeView, getStoreSupplierPurchases);
router.get('/suppliers/:id/payments', storeView, getStoreSupplierPayments);
router.post('/suppliers/:id/payments', storeCreate, createStoreSupplierPayment);
router.get('/stock-issues', storeView, getStoreStockIssues);
router.post('/stock-issues', storeCreate, storeIssueSignatureUpload.single('receiverSignature'), createStoreStockIssue);
router.get('/stock-issues/:id', storeView, getStoreStockIssueById);
router.put('/stock-issues/:id', storeUpdate, storeIssueSignatureUpload.single('receiverSignature'), updateStoreStockIssue);
router.delete('/stock-issues/:id', storeDelete, deleteStoreStockIssue);
router.patch('/stock-issues/:id/approve', storeApprove, approveStoreStockIssue);
router.patch('/stock-issues/:id/reject', storeApprove, rejectStoreStockIssue);
router.get('/returns', storeView, getStoreReturns);
router.post('/returns', storeCreate, createStoreReturn);
router.get('/returns/:id', storeView, getStoreReturnById);
router.delete('/returns/:id', storeDelete, deleteStoreReturn);
router.get('/damaged-stock', storeView, getStoreDamagedStock);
router.post('/damaged-stock', storeCreate, createStoreDamagedStock);
router.get('/damaged-stock/:id', storeView, getStoreDamagedStockById);
router.patch('/damaged-stock/:id/approve', storeApprove, approveStoreDamagedStock);
router.patch('/damaged-stock/:id/reject', storeApprove, rejectStoreDamagedStock);
router.delete('/damaged-stock/:id', storeDelete, deleteStoreDamagedStock);

export { router as storeRoutes };
