import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { qualificationsService } from './qualifications.service.js';

export const createQualification = asyncHandler(async (req, res) => {
  const result = await qualificationsService.createQualification(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Qualification created successfully.',
    data: result,
  });
});

export const getQualifications = asyncHandler(async (req, res) => {
  const result = await qualificationsService.getQualifications(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Qualifications fetched successfully.',
    data: result,
  });
});

export const getQualificationById = asyncHandler(async (req, res) => {
  const result = await qualificationsService.getQualificationById(req.tenantId, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Qualification fetched successfully.',
    data: result,
  });
});

export const updateQualification = asyncHandler(async (req, res) => {
  const result = await qualificationsService.updateQualification(req.tenantId, req.params.id, req.body, req.branchScope);

  return apiResponse(res, {
    message: 'Qualification updated successfully.',
    data: result,
  });
});

export const deleteQualification = asyncHandler(async (req, res) => {
  const result = await qualificationsService.deleteQualification(req.tenantId, req.params.id, req.branchScope);

  return apiResponse(res, {
    message: 'Qualification deleted successfully.',
    data: result,
  });
});
