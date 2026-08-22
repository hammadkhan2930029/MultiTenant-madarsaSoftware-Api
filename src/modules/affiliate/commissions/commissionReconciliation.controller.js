import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { auditService } from '../../security/index.js';
import { commissionReconciliationService } from './commissionReconciliation.service.js';
const context = (req) => ({ adminId: req.admin?.id || null, audit: auditService.buildRequestAuditContext(req) });
export const previewCommissionReconciliation = asyncHandler(async (_req, res) => apiResponse(res, { message: 'Commission reconciliation preview fetched successfully.', data: await commissionReconciliationService.preview() }));
export const runCommissionReconciliation = asyncHandler(async (req, res) => apiResponse(res, { message: 'Commission reconciliation completed successfully.', data: await commissionReconciliationService.run(context(req)) }));
