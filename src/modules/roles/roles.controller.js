import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditService } from '../security/index.js';
import { rolesService } from './roles.service.js';

const buildRequester = (req) => ({
  ...req.auth,
  audit: auditService.buildRequestAuditContext(req),
});

export const createRole = asyncHandler(async (req, res) => {
  const result = await rolesService.createRole(req.body, buildRequester(req));

  return apiResponse(res, {
    statusCode: 201,
    message: 'Role created successfully.',
    data: result,
  });
});

export const getRoles = asyncHandler(async (req, res) => {
  const result = await rolesService.getRoles(req.query, buildRequester(req));

  return apiResponse(res, {
    message: 'Roles fetched successfully.',
    data: result,
  });
});

export const getPermissions = asyncHandler(async (req, res) => {
  const result = await rolesService.getPermissions(buildRequester(req));

  return apiResponse(res, {
    message: 'Permissions fetched successfully.',
    data: result,
  });
});

export const getRoleById = asyncHandler(async (req, res) => {
  const result = await rolesService.getRoleById(req.params.id, buildRequester(req));

  return apiResponse(res, {
    message: 'Role fetched successfully.',
    data: result,
  });
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  const result = await rolesService.getRolePermissionsById(req.params.id, buildRequester(req));

  return apiResponse(res, {
    message: 'Role permissions fetched successfully.',
    data: result,
  });
});

export const updateRole = asyncHandler(async (req, res) => {
  const result = await rolesService.updateRole(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'Role updated successfully.',
    data: result,
  });
});

export const deleteRole = asyncHandler(async (req, res) => {
  const result = await rolesService.deleteRole(req.params.id, buildRequester(req));

  return apiResponse(res, {
    message: 'Role deleted successfully.',
    data: result,
  });
});

export const assignRolePermissions = asyncHandler(async (req, res) => {
  const result = await rolesService.assignPermissionsToRole(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'Role permissions updated successfully.',
    data: result,
  });
});
