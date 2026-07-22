import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { expenseCategoriesService } from './expenseCategories.service.js';

export const createExpenseCategory = asyncHandler(async (req, res) => {
  const category = await expenseCategoriesService.createCategory(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'خرچ کی قسم کامیابی سے شامل ہو گئی۔', data: category });
});

export const getExpenseCategories = asyncHandler(async (req, res) => {
  const categories = await expenseCategoriesService.getCategories(req.tenantId, req.query);
  return apiResponse(res, { message: 'خرچ کی اقسام کامیابی سے لوڈ ہو گئیں۔', data: categories });
});

export const getExpenseCategoryById = asyncHandler(async (req, res) => {
  const category = await expenseCategoriesService.getCategoryById(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'خرچ کی قسم کامیابی سے لوڈ ہو گئی۔', data: category });
});

export const updateExpenseCategory = asyncHandler(async (req, res) => {
  const category = await expenseCategoriesService.updateCategory(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'خرچ کی قسم کامیابی سے تبدیل ہو گئی۔', data: category });
});

export const deactivateExpenseCategory = asyncHandler(async (req, res) => {
  const category = await expenseCategoriesService.deactivateCategory(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'خرچ کی قسم کامیابی سے ختم کر دی گئی۔', data: category });
});
