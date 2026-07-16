import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { weeklyHifzService } from './weekly.service.js';

export const createWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.createEntry(req.tenantId, req.body, req.branchScope);
  return apiResponse(res, { statusCode: 201, message: 'ہفتہ وار جائزہ کامیابی سے محفوظ ہو گیا۔', data: entry });
});
export const getWeeklyEntries = asyncHandler(async (req, res) => {
  const entries = await weeklyHifzService.getEntries(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, { message: 'ہفتہ وار جائزے کامیابی سے حاصل ہو گئے۔', data: entries });
});
export const getWeeklyEntryById = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.getEntryById(req.tenantId, Number(req.params.id), req.branchScope);
  return apiResponse(res, { message: 'ہفتہ وار جائزے کی تفصیل کامیابی سے حاصل ہو گئی۔', data: entry });
});
export const updateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.updateEntry(req.tenantId, Number(req.params.id), req.body, req.branchScope);
  return apiResponse(res, { message: 'ہفتہ وار جائزہ کامیابی سے اپڈیٹ ہو گیا۔', data: entry });
});
export const deactivateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.deactivateEntry(req.tenantId, Number(req.params.id), req.branchScope);
  return apiResponse(res, { message: 'ہفتہ وار جائزہ غیر فعال کر دیا گیا۔', data: entry });
});
