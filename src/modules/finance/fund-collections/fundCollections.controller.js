import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { fundCollectionsService } from './fundCollections.service.js';

export const createFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Fund collection saved successfully.', data: entry });
});
export const getFundCollections = asyncHandler(async (req, res) => {
  const entries = await fundCollectionsService.getEntries(req.query);
  return apiResponse(res, { message: 'Fund collections fetched successfully.', data: entries });
});
export const getFundCollectionById = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'Fund collection detail fetched successfully.', data: entry });
});
export const updateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Fund collection updated successfully.', data: entry });
});
export const deactivateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'Fund collection deactivated successfully.', data: entry });
});
