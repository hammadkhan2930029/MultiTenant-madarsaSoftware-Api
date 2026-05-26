import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { financialService } from './financial.service.js';

export const getFinancialRecords = asyncHandler(async (req, res) => {
  const data = await financialService.list(req.query);
  return apiResponse(res, { message: 'Financial records fetched successfully.', data });
});

export const getFinancialSummary = asyncHandler(async (req, res) => {
  const data = await financialService.summary(req.query);
  return apiResponse(res, { message: 'Financial summary fetched successfully.', data });
});

export const createFinancialRecord = asyncHandler(async (req, res) => {
  const data = await financialService.create(req.body, req.admin);
  return apiResponse(res, { statusCode: 201, message: 'Financial record created successfully.', data });
});

export const updateFinancialRecord = asyncHandler(async (req, res) => {
  const data = await financialService.update(req.params.id, req.body);
  return apiResponse(res, { message: 'Financial record updated successfully.', data });
});

export const deleteFinancialRecord = asyncHandler(async (req, res) => {
  const data = await financialService.remove(req.params.id);
  return apiResponse(res, { message: 'Financial record deleted successfully.', data });
});
