import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { usersService } from './users.service.js';

export const createUser = asyncHandler(async (req, res) => {
  const result = await usersService.createUser(req.body, req.admin);

  return apiResponse(res, {
    statusCode: 201,
    message: 'User created successfully.',
    data: result,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await usersService.getUsers(req.query, req.auth);

  return apiResponse(res, {
    message: 'Users fetched successfully.',
    data: result,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const result = await usersService.getUserById(req.params.id, req.auth);

  return apiResponse(res, {
    message: 'User fetched successfully.',
    data: result,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const result = await usersService.updateUser(req.params.id, req.body, req.auth);

  return apiResponse(res, {
    message: 'User updated successfully.',
    data: result,
  });
});
