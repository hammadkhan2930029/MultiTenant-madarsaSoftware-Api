import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { healthService } from './health.service.js';

export const getHealthStatus = asyncHandler(async (_req, res) => {
  const result = await healthService.getSystemHealth();

  return apiResponse(res, {
    message: 'Health check fetched successfully.',
    data: result,
  });
});
