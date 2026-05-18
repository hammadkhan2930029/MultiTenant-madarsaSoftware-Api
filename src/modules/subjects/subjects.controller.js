import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { subjectsService } from './subjects.service.js';

export const createSubject = asyncHandler(async (req, res) => {
  const result = await subjectsService.createSubject(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Subject created successfully.',
    data: result,
  });
});

export const getSubjects = asyncHandler(async (req, res) => {
  const result = await subjectsService.getSubjects(req.query);

  return apiResponse(res, {
    message: 'Subjects fetched successfully.',
    data: result,
  });
});

export const getSubjectById = asyncHandler(async (req, res) => {
  const result = await subjectsService.getSubjectById(req.params.id);

  return apiResponse(res, {
    message: 'Subject fetched successfully.',
    data: result,
  });
});

export const updateSubject = asyncHandler(async (req, res) => {
  const result = await subjectsService.updateSubject(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Subject updated successfully.',
    data: result,
  });
});

export const deleteSubject = asyncHandler(async (req, res) => {
  const result = await subjectsService.deleteSubject(req.params.id);

  return apiResponse(res, {
    message: 'Subject deleted successfully.',
    data: result,
  });
});
