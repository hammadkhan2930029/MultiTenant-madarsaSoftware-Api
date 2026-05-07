import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { classesService } from './classes.service.js';

export const createClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.createClass(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Class created successfully.',
    data: academicClass,
  });
});

export const getClasses = asyncHandler(async (req, res) => {
  const academicClasses = await classesService.getClasses(req.query);

  return apiResponse(res, {
    message: 'Classes fetched successfully.',
    data: academicClasses,
  });
});

export const getClassById = asyncHandler(async (req, res) => {
  const academicClass = await classesService.getClassById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Class fetched successfully.',
    data: academicClass,
  });
});

export const updateClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.updateClass(Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Class updated successfully.',
    data: academicClass,
  });
});

export const deactivateClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.deactivateClass(Number(req.params.id));

  return apiResponse(res, {
    message: 'Class deactivated successfully.',
    data: academicClass,
  });
});
