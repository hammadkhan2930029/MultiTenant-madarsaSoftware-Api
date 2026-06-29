import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { headsService } from './heads.service.js';

export const createHead = asyncHandler(async (req, res) => {
  const head = await headsService.createHead(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'مالیاتی قسم کامیابی سے شامل ہو گئی۔', data: head });
});
export const getHeads = asyncHandler(async (req, res) => {
  const heads = await headsService.getHeads(req.tenantId, req.query);
  return apiResponse(res, { message: 'مالیاتی اقسام کامیابی سے لوڈ ہو گئیں۔', data: heads });
});
export const getHeadById = asyncHandler(async (req, res) => {
  const head = await headsService.getHeadById(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'مالیاتی قسم کامیابی سے لوڈ ہو گئی۔', data: head });
});
export const updateHead = asyncHandler(async (req, res) => {
  const head = await headsService.updateHead(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'مالیاتی قسم کامیابی سے تبدیل ہو گئی۔', data: head });
});
export const deactivateHead = asyncHandler(async (req, res) => {
  const head = await headsService.deactivateHead(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'مالیاتی قسم کامیابی سے ختم کر دی گئی۔', data: head });
});
