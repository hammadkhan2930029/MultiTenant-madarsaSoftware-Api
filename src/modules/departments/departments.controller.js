import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { departmentsService } from './departments.service.js';

export const createDepartment = asyncHandler(async (req, res) => {
  const result = await departmentsService.createDepartment(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Department created successfully.',
    data: result,
  });
});

export const getDepartments = asyncHandler(async (req, res) => {
  const result = await departmentsService.getDepartments(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Departments fetched successfully.',
    data: result,
  });
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const result = await departmentsService.getDepartmentById(req.tenantId, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Department fetched successfully.',
    data: result,
  });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const result = await departmentsService.updateDepartment(req.tenantId, req.params.id, req.body, req.branchScope);

  return apiResponse(res, {
    message: 'Department updated successfully.',
    data: result,
  });
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  const result = await departmentsService.deleteDepartment(req.params.id);

  return apiResponse(res, {
    message: 'Department deleted successfully.',
    data: result,
  });
});
