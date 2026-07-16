import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { supportService } from './support.service.js';

export const createSupportRequest = asyncHandler(async (req, res) => {
  const result = await supportService.createSupportRequest(req.tenantId, req.body, req.admin, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Support request submitted successfully.',
    data: result,
  });
});

export const getSupportRequests = asyncHandler(async (req, res) => {
  const result = await supportService.getSupportRequests(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Support requests fetched successfully.',
    data: result,
  });
});
