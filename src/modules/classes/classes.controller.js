import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { classesService } from './classes.service.js';

export const createClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.createClass(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Class created successfully.',
    data: academicClass,
  });
});

export const bulkCreateClasses = asyncHandler(async (req, res) => {
  const result = await classesService.bulkCreateClasses(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Classes created successfully.',
    data: result,
  });
});

export const getClasses = asyncHandler(async (req, res) => {
  const academicClasses = await classesService.getClasses(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Classes fetched successfully.',
    data: academicClasses,
  });
});

export const getClassById = asyncHandler(async (req, res) => {
  const academicClass = await classesService.getClassById(req.tenantId, Number(req.params.id), req.branchScope);

  return apiResponse(res, {
    message: 'Class fetched successfully.',
    data: academicClass,
  });
});

export const updateClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.updateClass(req.tenantId, Number(req.params.id), req.body, req.branchScope);

  return apiResponse(res, {
    message: 'Class updated successfully.',
    data: academicClass,
  });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const academicClass = await classesService.deleteClass(req.tenantId, Number(req.params.id), req.branchScope);

  return apiResponse(res, {
    message: 'Class deleted successfully.',
    data: academicClass,
  });
});
