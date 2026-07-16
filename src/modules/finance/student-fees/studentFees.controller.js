import { apiResponse } from '../../../utils/apiResponse.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { studentFeesService } from './studentFees.service.js';

export const generateStudentFees = asyncHandler(async (req, res) => {
  const result = await studentFeesService.generateFees(req.tenantId, req.body, req.branchScope);
  return apiResponse(res, { statusCode: 201, message: 'Student fees generated successfully.', data: result });
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const result = await studentFeesService.getFees(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, { message: 'Student fees fetched successfully.', data: result });
});

export const getStudentFeeById = asyncHandler(async (req, res) => {
  const result = await studentFeesService.getFeeById(req.tenantId, Number(req.params.id), req.branchScope);
  return apiResponse(res, { message: 'Student fee voucher fetched successfully.', data: result });
});

export const getStudentFeeHistory = asyncHandler(async (req, res) => {
  const result = await studentFeesService.getStudentFeeHistory(req.tenantId, Number(req.params.studentId), req.branchScope);
  return apiResponse(res, { message: 'Student fee history fetched successfully.', data: result });
});

export const saveStudentFeePayment = asyncHandler(async (req, res) => {
  const result = await studentFeesService.savePayment(req.tenantId, Number(req.params.id), req.body, req.branchScope);
  return apiResponse(res, { message: 'Student fee payment saved successfully.', data: result });
});
