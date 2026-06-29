import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { dailyHifzService } from './daily.service.js';

export const createDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.createEntry(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'یومیہ جائزہ کامیابی سے محفوظ ہو گیا۔', data: entry });
});

export const getDailyEntries = asyncHandler(async (req, res) => {
  const entries = await dailyHifzService.getEntries(req.tenantId, req.query);
  return apiResponse(res, { message: 'یومیہ جائزے کامیابی سے حاصل ہو گئے۔', data: entries });
});

export const getDailyEntryById = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.getEntryById(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'یومیہ جائزے کی تفصیل کامیابی سے حاصل ہو گئی۔', data: entry });
});

export const updateDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.updateEntry(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'یومیہ جائزہ کامیابی سے اپڈیٹ ہو گیا۔', data: entry });
});

export const deactivateDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.deactivateEntry(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'یومیہ جائزہ غیر فعال کر دیا گیا۔', data: entry });
});
