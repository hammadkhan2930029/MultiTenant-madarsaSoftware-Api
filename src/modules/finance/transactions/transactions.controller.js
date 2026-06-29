import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { transactionsService } from './transactions.service.js';

export const createExpense = asyncHandler(async (req, res) => {
  const entry = await transactionsService.createExpense(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'خرچ کا ریکارڈ کامیابی سے محفوظ ہو گیا۔', data: entry });
});

export const getExpenses = asyncHandler(async (req, res) => {
  const entries = await transactionsService.getExpenses(req.tenantId, req.query);
  return apiResponse(res, { message: 'خرچ کے ریکارڈز کامیابی سے لوڈ ہو گئے۔', data: entries });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const entry = await transactionsService.createEntry(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'مالیاتی ریکارڈ کامیابی سے محفوظ ہو گیا۔', data: entry });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const entries = await transactionsService.getEntries(req.tenantId, req.query);
  return apiResponse(res, { message: 'مالیاتی ریکارڈز کامیابی سے لوڈ ہو گئے۔', data: entries });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const entry = await transactionsService.updateEntry(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'مالیاتی ریکارڈ کامیابی سے تبدیل ہو گیا۔', data: entry });
});

export const deactivateTransaction = asyncHandler(async (req, res) => {
  const entry = await transactionsService.deactivateEntry(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'مالیاتی ریکارڈ کامیابی سے حذف ہو گیا۔', data: entry });
});
