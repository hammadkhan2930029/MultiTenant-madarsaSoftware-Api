import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { affiliateWithdrawalsService } from './affiliateWithdrawals.service.js';
import { auditService } from '../../security/index.js';
const context = (req) => ({ adminId: req.admin?.id || null, audit: auditService.buildRequestAuditContext(req) });
export const listAffiliateWithdrawals = asyncHandler(async (req, res) => apiResponse(res, { message: 'Affiliate withdrawals fetched successfully.', data: await affiliateWithdrawalsService.list(req.query) }));
export const getAffiliateWithdrawal = asyncHandler(async (req, res) => apiResponse(res, { message: 'Affiliate withdrawal fetched successfully.', data: await affiliateWithdrawalsService.getById(Number(req.params.id)) }));
export const rejectAffiliateWithdrawal = asyncHandler(async (req, res) => apiResponse(res, { message: 'Withdrawal request rejected successfully.', data: await affiliateWithdrawalsService.reject(Number(req.params.id), req.body.adminNote, context(req)) }));
export const payAffiliateWithdrawal = asyncHandler(async (req, res) => apiResponse(res, { message: 'Withdrawal payment recorded successfully.', data: await affiliateWithdrawalsService.pay(Number(req.params.id), req.body, context(req)) }));
