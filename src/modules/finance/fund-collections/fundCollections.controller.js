import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { auditService } from '../../security/index.js';
import { fundCollectionsService } from './fundCollections.service.js';

const buildAuditContext = (req) => ({ ...auditService.buildRequestAuditContext(req), actorUserId: req.admin?.id || null });

export const createFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.createEntry(req.tenantId, req.body, req.branchScope, req.file, buildAuditContext(req));
  return apiResponse(res, { statusCode: 201, message: 'فنڈ وصولی کامیابی سے محفوظ ہو گئی۔', data: entry });
});
export const getFundCollections = asyncHandler(async (req, res) => {
  const entries = await fundCollectionsService.getEntries(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, { message: 'فنڈ وصولی کی فہرست کامیابی سے حاصل ہو گئی۔', data: entries });
});
export const getFundCollectionById = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.getEntryById(req.tenantId, Number(req.params.id), req.branchScope);
  return apiResponse(res, { message: 'فنڈ وصولی کی تفصیل کامیابی سے حاصل ہو گئی۔', data: entry });
});
export const updateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.updateEntry(req.tenantId, Number(req.params.id), req.body, req.branchScope, req.file, buildAuditContext(req));
  return apiResponse(res, { message: 'فنڈ وصولی کامیابی سے اپڈیٹ ہو گئی۔', data: entry });
});
export const deactivateFundCollection = asyncHandler(async (req, res) => {
  const entry = await fundCollectionsService.deactivateEntry(req.tenantId, Number(req.params.id), req.branchScope, buildAuditContext(req));
  return apiResponse(res, { message: 'فنڈ وصولی غیر فعال کر دی گئی۔', data: entry });
});

export const printFundCollection = asyncHandler(async (req, res) => {
  await fundCollectionsService.recordPrint(req.tenantId, Number(req.params.id), req.branchScope, buildAuditContext(req));
  return apiResponse(res, { message: 'Print action logged successfully.' });
});
