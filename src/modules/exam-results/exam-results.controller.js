import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { examResultsService } from './exam-results.service.js';

export const saveExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.saveExamResult(req.tenantId, req.body, null, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Exam result saved successfully.',
    data: result,
  });
});

export const getExamResults = asyncHandler(async (req, res) => {
  const result = await examResultsService.getExamResults(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Exam results fetched successfully.',
    data: result,
  });
});

export const getExamResultById = asyncHandler(async (req, res) => {
  const result = await examResultsService.getExamResultById(req.tenantId, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Exam result fetched successfully.',
    data: result,
  });
});

export const findStudentExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.findStudentExamResult(req.tenantId, req.params.studentId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Student exam result fetched successfully.',
    data: result,
  });
});

export const updateExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.saveExamResult(req.tenantId, req.body, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Exam result updated successfully.',
    data: result,
  });
});

export const deleteExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.deleteExamResult(req.tenantId, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Exam result deleted successfully.',
    data: result,
  });
});
