import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { resultGradesService } from './result-grades.service.js';

export const createResultGrade = asyncHandler(async (req, res) => {
  const result = await resultGradesService.createResultGrade(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Result grade created successfully.',
    data: result,
  });
});

export const getResultGrades = asyncHandler(async (req, res) => {
  const result = await resultGradesService.getResultGrades(req.query);

  return apiResponse(res, {
    message: 'Result grades fetched successfully.',
    data: result,
  });
});

export const getResultGradeById = asyncHandler(async (req, res) => {
  const result = await resultGradesService.getResultGradeById(req.params.id);

  return apiResponse(res, {
    message: 'Result grade fetched successfully.',
    data: result,
  });
});

export const updateResultGrade = asyncHandler(async (req, res) => {
  const result = await resultGradesService.updateResultGrade(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Result grade updated successfully.',
    data: result,
  });
});

export const deleteResultGrade = asyncHandler(async (req, res) => {
  const result = await resultGradesService.deleteResultGrade(req.params.id);

  return apiResponse(res, {
    message: 'Result grade deleted successfully.',
    data: result,
  });
});
