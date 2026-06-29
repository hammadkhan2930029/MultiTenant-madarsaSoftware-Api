import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { tenantCurrentService } from './tenantCurrent.service.js';

export const getCurrentTenant = asyncHandler(async (req, res) => {
  const result = await tenantCurrentService.getCurrentTenantBranding(req.tenantId);

  return apiResponse(res, {
    message: 'Current tenant branding fetched successfully.',
    data: result,
  });
});
