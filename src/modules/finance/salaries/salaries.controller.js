import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { salariesService } from './salaries.service.js';

export const createSalaryEntry = asyncHandler(async (req, res) => {
  const entry = await salariesService.createEntry(req.tenantId, req.body);
  return apiResponse(res, { statusCode: 201, message: 'Salary entry saved successfully.', data: entry });
});
export const getSalaryEntries = asyncHandler(async (req, res) => {
  const entries = await salariesService.getEntries(req.tenantId, req.query);
  return apiResponse(res, { message: 'Salary entries fetched successfully.', data: entries });
});
export const getSalaryEntryById = asyncHandler(async (req, res) => {
  const entry = await salariesService.getEntryById(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'Salary entry detail fetched successfully.', data: entry });
});
export const updateSalaryEntry = asyncHandler(async (req, res) => {
  const entry = await salariesService.updateEntry(req.tenantId, Number(req.params.id), req.body);
  return apiResponse(res, { message: 'Salary entry updated successfully.', data: entry });
});
export const deactivateSalaryEntry = asyncHandler(async (req, res) => {
  const entry = await salariesService.deactivateEntry(req.tenantId, Number(req.params.id));
  return apiResponse(res, { message: 'Salary entry deactivated successfully.', data: entry });
});
