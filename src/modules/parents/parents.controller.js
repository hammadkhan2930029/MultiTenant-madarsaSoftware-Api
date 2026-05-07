import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parentsService } from './parents.service.js';

export const createParent = asyncHandler(async (req, res) => {
  const parent = await parentsService.createParent(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Parent created successfully.',
    data: parent,
  });
});

export const getParents = asyncHandler(async (req, res) => {
  const parents = await parentsService.getParents(req.query);

  return apiResponse(res, {
    message: 'Parents fetched successfully.',
    data: parents,
  });
});

export const getParentById = asyncHandler(async (req, res) => {
  const parent = await parentsService.getParentById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Parent fetched successfully.',
    data: parent,
  });
});

export const updateParent = asyncHandler(async (req, res) => {
  const parent = await parentsService.updateParent(Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Parent updated successfully.',
    data: parent,
  });
});

export const deactivateParent = asyncHandler(async (req, res) => {
  const parent = await parentsService.deactivateParent(Number(req.params.id));

  return apiResponse(res, {
    message: 'Parent deactivated successfully.',
    data: parent,
  });
});
