import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { dailyHifzService } from './daily.service.js';

export const createDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Daily jaiza saved successfully.', data: entry });
});

export const getDailyEntries = asyncHandler(async (req, res) => {
  const entries = await dailyHifzService.getEntries(req.query);
  return apiResponse(res, { message: 'Daily jaiza entries fetched successfully.', data: entries });
});

export const getDailyEntryById = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'Daily jaiza detail fetched successfully.', data: entry });
});

export const updateDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Daily jaiza updated successfully.', data: entry });
});

export const deactivateDailyEntry = asyncHandler(async (req, res) => {
  const entry = await dailyHifzService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'Daily jaiza deactivated successfully.', data: entry });
});
