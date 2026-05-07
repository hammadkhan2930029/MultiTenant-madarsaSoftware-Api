import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { branchesService } from './branches.service.js';

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.createBranch(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Branch created successfully.',
    data: branch,
  });
});

export const getBranches = asyncHandler(async (req, res) => {
  const branches = await branchesService.getBranches(req.query);

  return apiResponse(res, {
    message: 'Branches fetched successfully.',
    data: branches,
  });
});

export const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchesService.getBranchById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Branch fetched successfully.',
    data: branch,
  });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.updateBranch(Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Branch updated successfully.',
    data: branch,
  });
});

export const deactivateBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.deactivateBranch(Number(req.params.id));

  return apiResponse(res, {
    message: 'Branch deactivated successfully.',
    data: branch,
  });
});
