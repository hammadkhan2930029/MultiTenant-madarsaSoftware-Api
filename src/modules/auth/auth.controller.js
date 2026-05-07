import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authService } from './auth.service.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.body);

  return apiResponse(res, {
    message: 'Admin login successful.',
    data: result,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword({
    adminId: req.admin.id,
    ...req.body,
  });

  return apiResponse(res, {
    message: 'Password changed successfully.',
    data: result,
  });
});

export const getCurrentAdminProfile = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentAdminProfile(req.admin.id);

  return apiResponse(res, {
    message: 'Admin profile fetched successfully.',
    data: result,
  });
});
