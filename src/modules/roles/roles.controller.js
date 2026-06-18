import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { rolesService } from './roles.service.js';

export const createRole = asyncHandler(async (req, res) => {
  const result = await rolesService.createRole(req.body, req.admin);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Role created successfully.',
    data: result,
  });
});

export const getRoles = asyncHandler(async (req, res) => {
  const result = await rolesService.getRoles(req.query);

  return apiResponse(res, {
    message: 'Roles fetched successfully.',
    data: result,
  });
});

export const getPermissions = asyncHandler(async (_req, res) => {
  const result = await rolesService.getPermissions();

  return apiResponse(res, {
    message: 'Permissions fetched successfully.',
    data: result,
  });
});

export const getRoleById = asyncHandler(async (req, res) => {
  const result = await rolesService.getRoleById(req.params.id);

  return apiResponse(res, {
    message: 'Role fetched successfully.',
    data: result,
  });
});

export const updateRole = asyncHandler(async (req, res) => {
  const result = await rolesService.updateRole(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Role updated successfully.',
    data: result,
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const result = await rolesService.deleteRole(req.params.id);

  return apiResponse(res, {
    message: 'Role deleted successfully.',
    data: result,
  });
});

export const assignRolePermissions = asyncHandler(async (req, res) => {
  const result = await rolesService.assignPermissionsToRole(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Role permissions updated successfully.',
    data: result,
  });
});
