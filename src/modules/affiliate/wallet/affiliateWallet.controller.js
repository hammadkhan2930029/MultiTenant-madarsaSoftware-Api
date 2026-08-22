import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { affiliateWalletService } from './affiliateWallet.service.js';
import { auditService } from '../../security/index.js';

const context = (req) => ({ tenantId: Number(req.tenantId), adminId: req.admin?.id || null, audit: auditService.buildRequestAuditContext(req) });
export const getWallet = asyncHandler(async (req, res) => apiResponse(res, { message: 'Affiliate wallet fetched successfully.', data: await affiliateWalletService.getWallet(context(req)) }));
export const createAccount = asyncHandler(async (req, res) => apiResponse(res, { statusCode: 201, message: 'Payment account created successfully.', data: await affiliateWalletService.createAccount(context(req), req.body) }));
export const updateAccount = asyncHandler(async (req, res) => apiResponse(res, { message: 'Payment account updated successfully.', data: await affiliateWalletService.updateAccount(context(req), Number(req.params.id), req.body) }));
export const deactivateAccount = asyncHandler(async (req, res) => apiResponse(res, { message: 'Payment account deactivated successfully.', data: await affiliateWalletService.deactivateAccount(context(req), Number(req.params.id)) }));
export const createWithdrawalRequest = asyncHandler(async (req, res) => apiResponse(res, { statusCode: 201, message: 'Withdrawal request created successfully.', data: await affiliateWalletService.createWithdrawalRequest(context(req), req.body) }));
