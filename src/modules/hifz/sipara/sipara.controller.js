import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { siparaHifzService } from './sipara.service.js';

export const createSiparaEntry = asyncHandler(async (req, res) => {
  const entry = await siparaHifzService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Sipara jaiza saved successfully.', data: entry });
});
export const getSiparaEntries = asyncHandler(async (req, res) => {
  const entries = await siparaHifzService.getEntries(req.query);
  return apiResponse(res, { message: 'Sipara jaiza entries fetched successfully.', data: entries });
});
export const getSiparaEntryById = asyncHandler(async (req, res) => {
  const entry = await siparaHifzService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'Sipara jaiza detail fetched successfully.', data: entry });
});
export const updateSiparaEntry = asyncHandler(async (req, res) => {
  const entry = await siparaHifzService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Sipara jaiza updated successfully.', data: entry });
});
export const deactivateSiparaEntry = asyncHandler(async (req, res) => {
  const entry = await siparaHifzService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'Sipara jaiza deactivated successfully.', data: entry });
});
