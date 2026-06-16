import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { storeService } from './store.service.js';

export const getStoreDashboard = asyncHandler(async (_req, res) => {
  const result = await storeService.getDashboard();

  return apiResponse(res, {
    message: 'Store dashboard fetched successfully.',
    data: result,
  });
});

export const getStoreMonthlyExpense = asyncHandler(async (_req, res) => {
  const result = await storeService.getMonthlyExpense();

  return apiResponse(res, {
    message: 'Store monthly expense fetched successfully.',
    data: result,
  });
});

export const getStoreApprovals = asyncHandler(async (_req, res) => {
  const result = await storeService.getApprovals();

  return apiResponse(res, {
    message: 'Store approvals fetched successfully.',
    data: result,
  });
});

export const getStoreUnits = asyncHandler(async (req, res) => {
  const result = await storeService.getUnits(req.query);

  return apiResponse(res, {
    message: 'Store units fetched successfully.',
    data: result,
  });
});

export const createStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.createUnit(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store unit created successfully.',
    data: result,
  });
});

export const getStoreUnitById = asyncHandler(async (req, res) => {
  const result = await storeService.getUnitById(req.params.id);

  return apiResponse(res, {
    message: 'Store unit fetched successfully.',
    data: result,
  });
});

export const updateStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.updateUnit(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store unit updated successfully.',
    data: result,
  });
});

export const deleteStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.deleteUnit(req.params.id);

  return apiResponse(res, {
    message: 'Store unit deleted successfully.',
    data: result,
  });
});

export const getStoreCategories = asyncHandler(async (req, res) => {
  const result = await storeService.getCategories(req.query);

  return apiResponse(res, {
    message: 'Store categories fetched successfully.',
    data: result,
  });
});

export const createStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.createCategory(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store category created successfully.',
    data: result,
  });
});

export const getStoreCategoryById = asyncHandler(async (req, res) => {
  const result = await storeService.getCategoryById(req.params.id);

  return apiResponse(res, {
    message: 'Store category fetched successfully.',
    data: result,
  });
});

export const updateStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.updateCategory(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store category updated successfully.',
    data: result,
  });
});

export const deleteStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.deleteCategory(req.params.id);

  return apiResponse(res, {
    message: 'Store category deleted successfully.',
    data: result,
  });
});

export const approveStoreApproval = asyncHandler(async (req, res) => {
  const result = await storeService.approveApproval({
    moduleType: req.params.moduleType,
    id: req.params.id,
    remarks: req.body?.remarks,
    admin: req.admin,
  });

  return apiResponse(res, {
    message: 'Store approval approved successfully.',
    data: result,
  });
});

export const rejectStoreApproval = asyncHandler(async (req, res) => {
  const result = await storeService.rejectApproval({
    moduleType: req.params.moduleType,
    id: req.params.id,
    remarks: req.body?.remarks,
    admin: req.admin,
  });

  return apiResponse(res, {
    message: 'Store approval rejected successfully.',
    data: result,
  });
});

export const getStoreItems = asyncHandler(async (req, res) => {
  const result = await storeService.getItems(req.query);

  return apiResponse(res, {
    message: 'Store items fetched successfully.',
    data: result,
  });
});

export const createStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.createItem(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store item created successfully.',
    data: result,
  });
});

export const getStoreItemById = asyncHandler(async (req, res) => {
  const result = await storeService.getItemById(req.params.id);

  return apiResponse(res, {
    message: 'Store item fetched successfully.',
    data: result,
  });
});

export const updateStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.updateItem(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store item updated successfully.',
    data: result,
  });
});

export const deleteStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.deleteItem(req.params.id);

  return apiResponse(res, {
    message: 'Store item deleted successfully.',
    data: result,
  });
});

export const getStoreSuppliers = asyncHandler(async (_req, res) => {
  const result = await storeService.getSuppliers();

  return apiResponse(res, {
    message: 'Store suppliers fetched successfully.',
    data: result,
  });
});

export const createStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.createSupplier(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store supplier created successfully.',
    data: result,
  });
});

export const getStoreSupplierById = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierById(req.params.id);

  return apiResponse(res, {
    message: 'Store supplier fetched successfully.',
    data: result,
  });
});

export const updateStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.updateSupplier(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store supplier updated successfully.',
    data: result,
  });
});

export const deleteStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.deleteSupplier(req.params.id);

  return apiResponse(res, {
    message: 'Store supplier deleted successfully.',
    data: result,
  });
});

export const getStoreSupplierPurchases = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierPurchases(req.params.id);

  return apiResponse(res, {
    message: 'Store supplier purchases fetched successfully.',
    data: result,
  });
});

export const getStoreSupplierPayments = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierPayments(req.params.id);

  return apiResponse(res, {
    message: 'Store supplier payments fetched successfully.',
    data: result,
  });
});

export const createStoreSupplierPayment = asyncHandler(async (req, res) => {
  const result = await storeService.createSupplierPayment(req.params.id, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store supplier payment created successfully.',
    data: result,
  });
});

export const getStorePurchases = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchases(req.query);

  return apiResponse(res, {
    message: 'Store purchases fetched successfully.',
    data: result,
  });
});

export const createStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.createPurchase({ body: req.body, file: req.file });

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store purchase created successfully.',
    data: result,
  });
});

export const getStorePurchaseById = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchaseById(req.params.id);

  return apiResponse(res, {
    message: 'Store purchase fetched successfully.',
    data: result,
  });
});

export const updateStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.updatePurchase(req.params.id, { body: req.body, file: req.file });

  return apiResponse(res, {
    message: 'Store purchase updated successfully.',
    data: result,
  });
});

export const deleteStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.deletePurchase(req.params.id);

  return apiResponse(res, {
    message: 'Store purchase deleted successfully.',
    data: result,
  });
});

export const getStoreStockIssues = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssues(req.query);
  return apiResponse(res, { message: 'Store stock issues fetched successfully.', data: result });
});

export const createStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.createStockIssue({ body: req.body, file: req.file });
  return apiResponse(res, { statusCode: 201, message: 'Store stock issue created successfully.', data: result });
});

export const getStoreStockIssueById = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssueById(req.params.id);
  return apiResponse(res, { message: 'Store stock issue fetched successfully.', data: result });
});

export const updateStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.updateStockIssue(req.params.id, { body: req.body, file: req.file });
  return apiResponse(res, { message: 'Store stock issue updated successfully.', data: result });
});

export const deleteStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.deleteStockIssue(req.params.id);
  return apiResponse(res, { message: 'Store stock issue deleted successfully.', data: result });
});

export const approveStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.approveStockIssue(req.params.id);
  return apiResponse(res, { message: 'Store stock issue approved successfully.', data: result });
});

export const rejectStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.rejectStockIssue(req.params.id);
  return apiResponse(res, { message: 'Store stock issue rejected successfully.', data: result });
});

export const getStoreReturns = asyncHandler(async (req, res) => {
  const result = await storeService.getReturns(req.query);
  return apiResponse(res, { message: 'Store returns fetched successfully.', data: result });
});

export const createStoreReturn = asyncHandler(async (req, res) => {
  const result = await storeService.createReturn(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Store return created successfully.', data: result });
});

export const getStoreReturnById = asyncHandler(async (req, res) => {
  const result = await storeService.getReturnById(req.params.id);
  return apiResponse(res, { message: 'Store return fetched successfully.', data: result });
});

export const deleteStoreReturn = asyncHandler(async (req, res) => {
  const result = await storeService.deleteReturn(req.params.id);
  return apiResponse(res, { message: 'Store return deleted successfully.', data: result });
});

export const getStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStock(req.query);
  return apiResponse(res, { message: 'Store damaged stock fetched successfully.', data: result });
});

export const createStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.createDamagedStock(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Store damaged stock created successfully.', data: result });
});

export const getStoreDamagedStockById = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStockById(req.params.id);
  return apiResponse(res, { message: 'Store damaged stock fetched successfully.', data: result });
});

export const approveStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.approveDamagedStock(req.params.id);
  return apiResponse(res, { message: 'Store damaged stock approved successfully.', data: result });
});

export const rejectStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.rejectDamagedStock(req.params.id);
  return apiResponse(res, { message: 'Store damaged stock rejected successfully.', data: result });
});

export const deleteStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.deleteDamagedStock(req.params.id);
  return apiResponse(res, { message: 'Store damaged stock deleted successfully.', data: result });
});

export const getStoreDailyStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDailyStockReport(req.query);
  return apiResponse(res, { message: 'Store daily stock report fetched successfully.', data: result });
});

export const getStoreMonthlyStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getMonthlyStockReport(req.query);
  return apiResponse(res, { message: 'Store monthly stock report fetched successfully.', data: result });
});

export const getStorePurchaseReport = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchaseReport(req.query);
  return apiResponse(res, { message: 'Store purchase report fetched successfully.', data: result });
});

export const getStoreSupplierReport = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierReport(req.query);
  return apiResponse(res, { message: 'Store supplier report fetched successfully.', data: result });
});

export const getStoreStockIssueReport = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssueReport(req.query);
  return apiResponse(res, { message: 'Store stock issue report fetched successfully.', data: result });
});

export const getStoreDepartmentWiseReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDepartmentWiseReport(req.query);
  return apiResponse(res, { message: 'Store department wise report fetched successfully.', data: result });
});

export const getStoreLowStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getLowStockReport(req.query);
  return apiResponse(res, { message: 'Store low stock report fetched successfully.', data: result });
});

export const getStoreDamagedStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStockReport(req.query);
  return apiResponse(res, { message: 'Store damaged stock report fetched successfully.', data: result });
});

export const getStoreValueReport = asyncHandler(async (req, res) => {
  const result = await storeService.getStoreValueReport(req.query);
  return apiResponse(res, { message: 'Store value report fetched successfully.', data: result });
});

export const getStoreItemLedgerReport = asyncHandler(async (req, res) => {
  const result = await storeService.getItemLedgerReport(req.params.itemId, req.query);
  return apiResponse(res, { message: 'Store item ledger report fetched successfully.', data: result });
});

const sendHtml = (res, html) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
};

const sendCsv = (res, csv, filename) => {
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(`\uFEFF${csv}`);
};

export const exportStorePurchasesPdf = asyncHandler(async (req, res) => {
  const html = await storeService.exportPurchases({ query: req.query, format: 'html', admin: req.admin });
  return sendHtml(res, html);
});

export const exportStorePurchasesExcel = asyncHandler(async (req, res) => {
  const csv = await storeService.exportPurchases({ query: req.query, format: 'csv', admin: req.admin });
  return sendCsv(res, csv, 'store-purchases.xls');
});

export const exportStoreStockReportPdf = asyncHandler(async (req, res) => {
  const html = await storeService.exportStockReport({ query: req.query, format: 'html', admin: req.admin });
  return sendHtml(res, html);
});

export const exportStoreStockReportExcel = asyncHandler(async (req, res) => {
  const csv = await storeService.exportStockReport({ query: req.query, format: 'csv', admin: req.admin });
  return sendCsv(res, csv, 'store-stock-report.xls');
});

export const printStoreInvoice = asyncHandler(async (req, res) => {
  const html = await storeService.getPurchaseInvoiceHtml(req.params.purchaseId, req.admin);
  return sendHtml(res, html);
});

export const printStoreIssueSlip = asyncHandler(async (req, res) => {
  const html = await storeService.getIssueSlipHtml(req.params.issueId, req.admin);
  return sendHtml(res, html);
});
