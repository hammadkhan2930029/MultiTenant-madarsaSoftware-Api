import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { reportsService } from './reports.service.js';

export const getStudentsReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getStudentsReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Student report fetched successfully.',
    data: report,
  });
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getAttendanceReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Attendance report fetched successfully.',
    data: report,
  });
});

export const getHifzProgressReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getHifzProgressReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Hifz progress report fetched successfully.',
    data: report,
  });
});

export const getFundCollectionsReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getFundCollectionsReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Fund collection report fetched successfully.',
    data: report,
  });
});

export const getSalaryReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getSalaryReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Salary report fetched successfully.',
    data: report,
  });
});

export const getMonthlyFinanceSummaryReport = asyncHandler(async (req, res) => {
  const report = await reportsService.getMonthlyFinanceSummaryReport(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'Monthly finance summary fetched successfully.',
    data: report,
  });
});
