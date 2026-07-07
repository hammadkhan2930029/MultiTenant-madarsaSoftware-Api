import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditService } from '../security/index.js';
import { usersService } from './users.service.js';

const buildRequester = (req) => ({
  ...req.auth,
  audit: auditService.buildRequestAuditContext(req),
});

export const createUser = asyncHandler(async (req, res) => {
  const result = await usersService.createUser(req.body, buildRequester(req));

  return apiResponse(res, {
    statusCode: 201,
    message: 'User created successfully.',
    data: result,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await usersService.getUsers(req.query, buildRequester(req));

  return apiResponse(res, {
    message: 'Users fetched successfully.',
    data: result,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const result = await usersService.getUserById(req.params.id, buildRequester(req));

  return apiResponse(res, {
    message: 'User fetched successfully.',
    data: result,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const result = await usersService.updateUser(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'User updated successfully.',
    data: result,
  });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const result = await usersService.deactivateUser(req.params.id, buildRequester(req));

  return apiResponse(res, {
    message: 'User deactivated successfully.',
    data: result,
  });
});

export const assignUserRole = asyncHandler(async (req, res) => {
  const result = await usersService.assignRole(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'User role updated successfully.',
    data: result,
  });
});
