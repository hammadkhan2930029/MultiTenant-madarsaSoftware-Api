import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.use(authMiddleware);

router.get('/dashboard', getStoreDashboard);
router.get('/monthly-expense', getStoreMonthlyExpense);
router.get('/approvals', getStoreApprovals);
router.get('/units', getStoreUnits);
router.post('/units', createStoreUnit);
router.get('/units/:id', getStoreUnitById);
router.put('/units/:id', updateStoreUnit);
router.delete('/units/:id', deleteStoreUnit);
router.get('/categories', getStoreCategories);
router.post('/categories', createStoreCategory);
router.get('/categories/:id', getStoreCategoryById);
router.put('/categories/:id', updateStoreCategory);
router.delete('/categories/:id', deleteStoreCategory);
router.patch('/approvals/:moduleType/:id/approve', approveStoreApproval);
router.patch('/approvals/:moduleType/:id/reject', rejectStoreApproval);
router.get('/export/purchases/pdf', exportStorePurchasesPdf);
router.get('/export/purchases/excel', exportStorePurchasesExcel);
router.get('/export/stock-report/pdf', exportStoreStockReportPdf);
router.get('/export/stock-report/excel', exportStoreStockReportExcel);
router.get('/print/invoice/:purchaseId', printStoreInvoice);
router.get('/print/issue-slip/:issueId', printStoreIssueSlip);
router.get('/reports/daily-stock', getStoreDailyStockReport);
router.get('/reports/monthly-stock', getStoreMonthlyStockReport);
router.get('/reports/purchases', getStorePurchaseReport);
router.get('/reports/suppliers', getStoreSupplierReport);
router.get('/reports/stock-issues', getStoreStockIssueReport);
router.get('/reports/department-wise', getStoreDepartmentWiseReport);
router.get('/reports/low-stock', getStoreLowStockReport);
router.get('/reports/damaged-stock', getStoreDamagedStockReport);
router.get('/reports/store-value', getStoreValueReport);
router.get('/reports/item-ledger/:itemId', getStoreItemLedgerReport);
router.get('/items', getStoreItems);
router.post('/items', createStoreItem);
router.get('/items/:id', getStoreItemById);
router.put('/items/:id', updateStoreItem);
router.delete('/items/:id', deleteStoreItem);
router.get('/purchases', getStorePurchases);
router.post('/purchases', storeInvoiceImageUpload.single('invoiceImage'), parseJsonFields(['items']), createStorePurchase);
router.get('/purchases/:id', getStorePurchaseById);
router.put('/purchases/:id', storeInvoiceImageUpload.single('invoiceImage'), parseJsonFields(['items']), updateStorePurchase);
router.delete('/purchases/:id', deleteStorePurchase);
router.get('/suppliers', getStoreSuppliers);
router.post('/suppliers', createStoreSupplier);
router.get('/suppliers/:id', getStoreSupplierById);
router.put('/suppliers/:id', updateStoreSupplier);
router.delete('/suppliers/:id', deleteStoreSupplier);
router.get('/suppliers/:id/purchases', getStoreSupplierPurchases);
router.get('/suppliers/:id/payments', getStoreSupplierPayments);
router.post('/suppliers/:id/payments', createStoreSupplierPayment);
router.get('/stock-issues', getStoreStockIssues);
router.post('/stock-issues', storeIssueSignatureUpload.single('receiverSignature'), createStoreStockIssue);
router.get('/stock-issues/:id', getStoreStockIssueById);
router.put('/stock-issues/:id', storeIssueSignatureUpload.single('receiverSignature'), updateStoreStockIssue);
router.delete('/stock-issues/:id', deleteStoreStockIssue);
router.patch('/stock-issues/:id/approve', approveStoreStockIssue);
router.patch('/stock-issues/:id/reject', rejectStoreStockIssue);
router.get('/returns', getStoreReturns);
router.post('/returns', createStoreReturn);
router.get('/returns/:id', getStoreReturnById);
router.delete('/returns/:id', deleteStoreReturn);
router.get('/damaged-stock', getStoreDamagedStock);
router.post('/damaged-stock', createStoreDamagedStock);
router.get('/damaged-stock/:id', getStoreDamagedStockById);
router.patch('/damaged-stock/:id/approve', approveStoreDamagedStock);
router.patch('/damaged-stock/:id/reject', rejectStoreDamagedStock);
router.delete('/damaged-stock/:id', deleteStoreDamagedStock);

export { router as storeRoutes };
