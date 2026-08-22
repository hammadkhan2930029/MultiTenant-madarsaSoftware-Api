import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { auditService } from '../../security/index.js';
import { commissionTiersService } from './commissionTiers.service.js';

const buildRequester = (req) => ({
  admin: req.admin,
  audit: auditService.buildRequestAuditContext(req),
});

export const listCommissionTiers = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate commission tiers fetched successfully.',
  data: await commissionTiersService.list(req.query),
}));

export const getCommissionTier = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate commission tier fetched successfully.',
  data: await commissionTiersService.getById(Number(req.params.id)),
}));

export const createCommissionTier = asyncHandler(async (req, res) => apiResponse(res, {
  statusCode: 201,
  message: 'Affiliate commission tier created successfully.',
  data: await commissionTiersService.create(req.body, buildRequester(req)),
}));

export const updateCommissionTier = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate commission tier updated successfully.',
  data: await commissionTiersService.update(Number(req.params.id), req.body, buildRequester(req)),
}));

export const updateCommissionTierStatus = asyncHandler(async (req, res) => apiResponse(res, {
  message: 'Affiliate commission tier status updated successfully.',
  data: await commissionTiersService.updateStatus(Number(req.params.id), req.body.status, buildRequester(req)),
}));
