import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { fundCollectionsService } from './fundCollections.service.js';

export const createFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.createEntry(req.body);
  return apiResponse(res, { statusCode: 201, message: 'فنڈ وصولی کامیابی سے محفوظ ہو گئی۔', data: entry });
});
export const getFundCollections = asyncHandler(async (req, res) => {
  const entries = await fundCollectionsService.getEntries(req.query);
  return apiResponse(res, { message: 'فنڈ وصولی کی فہرست کامیابی سے حاصل ہو گئی۔', data: entries });
});
export const getFundCollectionById = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.getEntryById(Number(req.params.id));
  return apiResponse(res, { message: 'فنڈ وصولی کی تفصیل کامیابی سے حاصل ہو گئی۔', data: entry });
});
export const updateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.updateEntry(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'فنڈ وصولی کامیابی سے اپڈیٹ ہو گئی۔', data: entry });
});
export const deactivateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.deactivateEntry(Number(req.params.id));
  return apiResponse(res, { message: 'فنڈ وصولی غیر فعال کر دی گئی۔', data: entry });
});
