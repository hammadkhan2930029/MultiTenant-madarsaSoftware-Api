import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { monthlyHifzService } from './monthly.service.js';

export const createMonthlyEntry = asyncHandler(async (req, res) => {
  const entry = await monthlyHifzService.createEntry(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'Monthly jaiza saved successfully.', data: entry });
});
export const getMonthlyEntries = asyncHandler(async (req, res) => {
  const entries = await monthlyHifzService.getEntries(req.tenantId, req.query);
  return apiResponse(res, { message: 'Monthly jaiza entries fetched successfully.', data: entries });
});
export const getMonthlyEntryById = asyncHandler(async (req, res) => {
  const entry = await monthlyHifzService.getEntryById(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'Monthly jaiza detail fetched successfully.', data: entry });
});
export const updateMonthlyEntry = asyncHandler(async (req, res) => {
  const entry = await monthlyHifzService.updateEntry(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Monthly jaiza updated successfully.', data: entry });
});
export const deactivateMonthlyEntry = asyncHandler(async (req, res) => {
  const entry = await monthlyHifzService.deactivateEntry(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'Monthly jaiza deactivated successfully.', data: entry });
});
