import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { storeService } from './store.service.js';

export const getStoreDashboard = asyncHandler(async (req, res) => {
  const result = await storeService.getDashboard(req.tenantId);

  return apiResponse(res, {
    message: 'Store dashboard fetched successfully.',
    data: result,
  });
});

export const getStoreMonthlyExpense = asyncHandler(async (req, res) => {
  const result = await storeService.getMonthlyExpense(req.tenantId);

  return apiResponse(res, {
    message: 'Store monthly expense fetched successfully.',
    data: result,
  });
});

export const getStoreApprovals = asyncHandler(async (req, res) => {
  const result = await storeService.getApprovals(req.tenantId);

  return apiResponse(res, {
    message: 'Store approvals fetched successfully.',
    data: result,
  });
});

export const getStoreUnits = asyncHandler(async (req, res) => {
  const result = await storeService.getUnits(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Store units fetched successfully.',
    data: result,
  });
});

export const createStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.createUnit(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store unit created successfully.',
    data: result,
  });
});

export const getStoreUnitById = asyncHandler(async (req, res) => {
  const result = await storeService.getUnitById(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store unit fetched successfully.',
    data: result,
  });
});

export const updateStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.updateUnit(req.tenantId, req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store unit updated successfully.',
    data: result,
  });
});

export const deleteStoreUnit = asyncHandler(async (req, res) => {
  const result = await storeService.deleteUnit(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store unit deleted successfully.',
    data: result,
  });
});

export const getStoreCategories = asyncHandler(async (req, res) => {
  const result = await storeService.getCategories(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Store categories fetched successfully.',
    data: result,
  });
});

export const createStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.createCategory(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store category created successfully.',
    data: result,
  });
});

export const getStoreCategoryById = asyncHandler(async (req, res) => {
  const result = await storeService.getCategoryById(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store category fetched successfully.',
    data: result,
  });
});

export const updateStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.updateCategory(req.tenantId, req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store category updated successfully.',
    data: result,
  });
});

export const deleteStoreCategory = asyncHandler(async (req, res) => {
  const result = await storeService.deleteCategory(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store category deleted successfully.',
    data: result,
  });
});

export const approveStoreApproval = asyncHandler(async (req, res) => {
  const result = await storeService.approveApproval({
    moduleType: req.params.moduleType,
    id: req.params.id,
    tenantId: req.tenantId,
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
    tenantId: req.tenantId,
    remarks: req.body?.remarks,
    admin: req.admin,
  });

  return apiResponse(res, {
    message: 'Store approval rejected successfully.',
    data: result,
  });
});

export const getStoreItems = asyncHandler(async (req, res) => {
  const result = await storeService.getItems(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Store items fetched successfully.',
    data: result,
  });
});

export const createStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.createItem(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store item created successfully.',
    data: result,
  });
});

export const getStoreItemById = asyncHandler(async (req, res) => {
  const result = await storeService.getItemById(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store item fetched successfully.',
    data: result,
  });
});

export const updateStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.updateItem(req.tenantId, req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store item updated successfully.',
    data: result,
  });
});

export const deleteStoreItem = asyncHandler(async (req, res) => {
  const result = await storeService.deleteItem(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store item deleted successfully.',
    data: result,
  });
});

export const getStoreSuppliers = asyncHandler(async (req, res) => {
  const result = await storeService.getSuppliers(req.tenantId);

  return apiResponse(res, {
    message: 'Store suppliers fetched successfully.',
    data: result,
  });
});

export const createStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.createSupplier(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store supplier created successfully.',
    data: result,
  });
});

export const getStoreSupplierById = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierById(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store supplier fetched successfully.',
    data: result,
  });
});

export const updateStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.updateSupplier(req.tenantId, req.params.id, req.body);

  return apiResponse(res, {
    message: 'Store supplier updated successfully.',
    data: result,
  });
});

export const deleteStoreSupplier = asyncHandler(async (req, res) => {
  const result = await storeService.deleteSupplier(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store supplier deleted successfully.',
    data: result,
  });
});

export const getStoreSupplierPurchases = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierPurchases(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store supplier purchases fetched successfully.',
    data: result,
  });
});

export const getStoreSupplierPayments = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierPayments(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store supplier payments fetched successfully.',
    data: result,
  });
});

export const createStoreSupplierPayment = asyncHandler(async (req, res) => {
  const result = await storeService.createSupplierPayment(req.tenantId, req.params.id, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store supplier payment created successfully.',
    data: result,
  });
});

export const getStorePurchases = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchases(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Store purchases fetched successfully.',
    data: result,
  });
});

export const createStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.createPurchase(req.tenantId, { body: req.body, file: req.file });

  return apiResponse(res, {
    statusCode: 201,
    message: 'Store purchase created successfully.',
    data: result,
  });
});

export const getStorePurchaseById = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchaseById(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store purchase fetched successfully.',
    data: result,
  });
});

export const updateStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.updatePurchase(req.tenantId, req.params.id, { body: req.body, file: req.file });

  return apiResponse(res, {
    message: 'Store purchase updated successfully.',
    data: result,
  });
});

export const deleteStorePurchase = asyncHandler(async (req, res) => {
  const result = await storeService.deletePurchase(req.tenantId, req.params.id);

  return apiResponse(res, {
    message: 'Store purchase deleted successfully.',
    data: result,
  });
});

export const getStoreStockIssues = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssues(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store stock issues fetched successfully.', data: result });
});

export const createStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.createStockIssue(req.tenantId, { body: req.body, file: req.file });
  return apiResponse(res, { statusCode: 201, message: 'Store stock issue created successfully.', data: result });
});

export const getStoreStockIssueById = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssueById(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store stock issue fetched successfully.', data: result });
});

export const updateStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.updateStockIssue(req.tenantId, req.params.id, { body: req.body, file: req.file });
  return apiResponse(res, { message: 'Store stock issue updated successfully.', data: result });
});

export const deleteStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.deleteStockIssue(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store stock issue deleted successfully.', data: result });
});

export const approveStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.approveStockIssue(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store stock issue approved successfully.', data: result });
});

export const rejectStoreStockIssue = asyncHandler(async (req, res) => {
  const result = await storeService.rejectStockIssue(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store stock issue rejected successfully.', data: result });
});

export const getStoreReturns = asyncHandler(async (req, res) => {
  const result = await storeService.getReturns(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store returns fetched successfully.', data: result });
});

export const createStoreReturn = asyncHandler(async (req, res) => {
  const result = await storeService.createReturn(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'Store return created successfully.', data: result });
});

export const getStoreReturnById = asyncHandler(async (req, res) => {
  const result = await storeService.getReturnById(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store return fetched successfully.', data: result });
});

export const deleteStoreReturn = asyncHandler(async (req, res) => {
  const result = await storeService.deleteReturn(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store return deleted successfully.', data: result });
});

export const getStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStock(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store damaged stock fetched successfully.', data: result });
});

export const createStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.createDamagedStock(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'Store damaged stock created successfully.', data: result });
});

export const getStoreDamagedStockById = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStockById(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store damaged stock fetched successfully.', data: result });
});

export const approveStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.approveDamagedStock(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store damaged stock approved successfully.', data: result });
});

export const rejectStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.rejectDamagedStock(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store damaged stock rejected successfully.', data: result });
});

export const deleteStoreDamagedStock = asyncHandler(async (req, res) => {
  const result = await storeService.deleteDamagedStock(req.tenantId, req.params.id);
  return apiResponse(res, { message: 'Store damaged stock deleted successfully.', data: result });
});

export const getStoreDailyStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDailyStockReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store daily stock report fetched successfully.', data: result });
});

export const getStoreMonthlyStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getMonthlyStockReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store monthly stock report fetched successfully.', data: result });
});

export const getStorePurchaseReport = asyncHandler(async (req, res) => {
  const result = await storeService.getPurchaseReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store purchase report fetched successfully.', data: result });
});

export const getStoreSupplierReport = asyncHandler(async (req, res) => {
  const result = await storeService.getSupplierReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store supplier report fetched successfully.', data: result });
});

export const getStoreStockIssueReport = asyncHandler(async (req, res) => {
  const result = await storeService.getStockIssueReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store stock issue report fetched successfully.', data: result });
});

export const getStoreDepartmentWiseReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDepartmentWiseReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store department wise report fetched successfully.', data: result });
});

export const getStoreLowStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getLowStockReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store low stock report fetched successfully.', data: result });
});

export const getStoreDamagedStockReport = asyncHandler(async (req, res) => {
  const result = await storeService.getDamagedStockReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store damaged stock report fetched successfully.', data: result });
});

export const getStoreValueReport = asyncHandler(async (req, res) => {
  const result = await storeService.getStoreValueReport(req.tenantId, req.query);
  return apiResponse(res, { message: 'Store value report fetched successfully.', data: result });
});

export const getStoreItemLedgerReport = asyncHandler(async (req, res) => {
  const result = await storeService.getItemLedgerReport(req.tenantId, req.params.itemId, req.query);
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
  const html = await storeService.exportPurchases({ tenantId: req.tenantId, query: req.query, format: 'html', admin: req.admin });
  return sendHtml(res, html);
});

export const exportStorePurchasesExcel = asyncHandler(async (req, res) => {
  const csv = await storeService.exportPurchases({ tenantId: req.tenantId, query: req.query, format: 'csv', admin: req.admin });
  return sendCsv(res, csv, 'store-purchases.xls');
});

export const exportStoreStockReportPdf = asyncHandler(async (req, res) => {
  const html = await storeService.exportStockReport({ tenantId: req.tenantId, query: req.query, format: 'html', admin: req.admin });
  return sendHtml(res, html);
});

export const exportStoreStockReportExcel = asyncHandler(async (req, res) => {
  const csv = await storeService.exportStockReport({ tenantId: req.tenantId, query: req.query, format: 'csv', admin: req.admin });
  return sendCsv(res, csv, 'store-stock-report.xls');
});

export const printStoreInvoice = asyncHandler(async (req, res) => {
  const html = await storeService.getPurchaseInvoiceHtml(req.tenantId, req.params.purchaseId, req.admin);
  return sendHtml(res, html);
});

export const printStoreIssueSlip = asyncHandler(async (req, res) => {
  const html = await storeService.getIssueSlipHtml(req.tenantId, req.params.issueId, req.admin);
  return sendHtml(res, html);
});
