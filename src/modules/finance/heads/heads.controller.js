import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { headsService } from './heads.service.js';

export const createHead = asyncHandler(async (req, res) => {
  const head = await headsService.createHead(req.body);
  return apiResponse(res, { statusCode: 201, message: 'Finance head created successfully.', data: head });
});
export const getHeads = asyncHandler(async (req, res) => {
  const heads = await headsService.getHeads(req.query);
  return apiResponse(res, { message: 'Finance heads fetched successfully.', data: heads });
});
export const getHeadById = asyncHandler(async (req, res) => {
  const head = await headsService.getHeadById(Number(req.params.id));
  return apiResponse(res, { message: 'Finance head fetched successfully.', data: head });
});
export const updateHead = asyncHandler(async (req, res) => {
  const head = await headsService.updateHead(Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Finance head updated successfully.', data: head });
});
export const deactivateHead = asyncHandler(async (req, res) => {
  const head = await headsService.deactivateHead(Number(req.params.id));
  return apiResponse(res, { message: 'Finance head deactivated successfully.', data: head });
});
