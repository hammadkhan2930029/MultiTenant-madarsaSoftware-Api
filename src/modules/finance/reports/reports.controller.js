import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { reportsService } from './reports.service.js';

export const getFinanceSummaryReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getFinanceSummary(req.tenantId, req.query);
  return apiResponse(res, { message: 'Finance summary report fetched successfully.', data: report });
});
export const getStudentFundHistoryReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getStudentFundHistory(req.tenantId, req.query);
  return apiResponse(res, { message: 'Student fund history fetched successfully.', data: report });
});
export const getTeacherSalaryHistoryReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getTeacherSalaryHistory(req.tenantId, req.query);
  return apiResponse(res, { message: 'Teacher salary history fetched successfully.', data: report });
});
