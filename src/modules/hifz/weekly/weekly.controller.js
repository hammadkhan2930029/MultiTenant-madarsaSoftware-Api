import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { weeklyHifzService } from './weekly.service.js';

export const createWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'ہفتہ وار جائزہ کامیابی سے محفوظ ہو گیا۔', data: entry });
});
export const getWeeklyEntries = asyncHandler(async (req, res) => {
  const entries = await weeklyHifzService.getEntries(req.query);
  return apiResponse(res, { message: 'ہفتہ وار جائزے کامیابی سے حاصل ہو گئے۔', data: entries });
});
export const getWeeklyEntryById = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'ہفتہ وار جائزے کی تفصیل کامیابی سے حاصل ہو گئی۔', data: entry });
});
export const updateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'ہفتہ وار جائزہ کامیابی سے اپڈیٹ ہو گیا۔', data: entry });
});
export const deactivateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'ہفتہ وار جائزہ غیر فعال کر دیا گیا۔', data: entry });
});
