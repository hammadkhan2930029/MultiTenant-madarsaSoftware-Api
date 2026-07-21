import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authService } from './auth.service.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  const result = await authService.loginAdmin(req.body, {
    tenantId: req.tenantId,
    isSystemHost: Boolean(req.tenantHost?.isSystemHost),
  });

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

export const requestForgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestForgotPassword({
    tenantId: req.tenantId,
    ...req.body,
  });

  return apiResponse(res, {
    message: 'Password reset request submitted successfully.',
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

export const getMadrassaProfile = asyncHandler(async (req, res) => {
  const result = await authService.getMadrassaProfile(req.admin, req.tenantId);

  return apiResponse(res, {
    message: 'Madrassa profile fetched successfully.',
    data: result,
  });
});

export const updateMadrassaProfile = asyncHandler(async (req, res) => {
  const result = await authService.updateMadrassaProfile(req.admin, req.tenantId, req.body, req.file);

  return apiResponse(res, {
    message: 'Madrassa profile updated successfully.',
    data: result,
  });
});
