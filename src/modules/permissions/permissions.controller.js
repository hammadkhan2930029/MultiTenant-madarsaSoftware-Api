import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { permissionsService } from './permissions.service.js';

export const getPermissions = asyncHandler(async (_req, res) => {
  const permissions = await permissionsService.getPermissions();

  return apiResponse(res, {
    message: 'Permissions fetched successfully.',
    data: permissions,
  });
});

export const getGroupedPermissions = asyncHandler(async (_req, res) => {
  const groups = await permissionsService.getGroupedPermissions();

  return apiResponse(res, {
    message: 'Grouped permissions fetched successfully.',
    data: groups,
  });
});
