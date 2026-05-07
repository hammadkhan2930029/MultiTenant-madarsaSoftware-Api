import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { weeklyHifzService } from './weekly.service.js';

export const createWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Weekly jaiza saved successfully.', data: entry });
});
export const getWeeklyEntries = asyncHandler(async (req, res) => {
  const entries = await weeklyHifzService.getEntries(req.query);
  return apiResponse(res, { message: 'Weekly jaiza entries fetched successfully.', data: entries });
});
export const getWeeklyEntryById = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'Weekly jaiza detail fetched successfully.', data: entry });
});
export const updateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Weekly jaiza updated successfully.', data: entry });
});
export const deactivateWeeklyEntry = asyncHandler(async (req, res) => {
  const entry = await weeklyHifzService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'Weekly jaiza deactivated successfully.', data: entry });
});
