import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { examResultsService } from './exam-results.service.js';

export const saveExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.saveExamResult(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Exam result saved successfully.',
    data: result,
  });
});

export const getExamResults = asyncHandler(async (req, res) => {
  const result = await examResultsService.getExamResults(req.query);

  return apiResponse(res, {
    message: 'Exam results fetched successfully.',
    data: result,
  });
});

export const getExamResultById = asyncHandler(async (req, res) => {
  const result = await examResultsService.getExamResultById(req.params.id);

  return apiResponse(res, {
    message: 'Exam result fetched successfully.',
    data: result,
  });
});

export const findStudentExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.findStudentExamResult(req.params.studentId, req.query);

  return apiResponse(res, {
    message: 'Student exam result fetched successfully.',
    data: result,
  });
});

export const updateExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.saveExamResult(req.body, req.params.id);

  return apiResponse(res, {
    message: 'Exam result updated successfully.',
    data: result,
  });
});

export const deleteExamResult = asyncHandler(async (req, res) => {
  const result = await examResultsService.deleteExamResult(req.params.id);

  return apiResponse(res, {
    message: 'Exam result deleted successfully.',
    data: result,
  });
});
