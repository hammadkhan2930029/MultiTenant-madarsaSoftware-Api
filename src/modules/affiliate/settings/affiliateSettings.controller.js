import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { auditService } from '../../security/index.js';
import { affiliateSettingsService } from './affiliateSettings.service.js';

const buildRequester = (req) => ({ admin: req.admin, audit: auditService.buildRequestAuditContext(req) });

export const getAffiliateSettings = asyncHandler(async (_req, res) => apiResponse(res, {
  message: 'Affiliate settings fetched successfully.',
  data: await affiliateSettingsService.get(),
}));

export const updateAffiliateSettings = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate settings updated successfully.',
  data: await affiliateSettingsService.update(req.body, buildRequester(req)),
}));
