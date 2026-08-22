import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { affiliateOverviewService } from './affiliateOverview.service.js';

export const listAffiliateOverview = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate overview fetched successfully.',
  data: await affiliateOverviewService.list(req.query),
}));

export const getAffiliateTenantDetail = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate tenant detail fetched successfully.',
  data: await affiliateOverviewService.getTenantDetail(Number(req.params.tenantId)),
}));
