import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { citiesService } from './cities.service.js';

export const createCity = asyncHandler(async (req, res) => {
  const result = await citiesService.createCity(req.tenantId, req.body, req.auth);

  return apiResponse(res, {
    statusCode: 201,
    message: 'City created successfully.',
    data: result,
  });
});

export const getCities = asyncHandler(async (req, res) => {
  const result = await citiesService.getCities(req.tenantId, req.query, req.auth);

  return apiResponse(res, {
    message: 'Cities fetched successfully.',
    data: result,
  });
});

export const getCityById = asyncHandler(async (req, res) => {
  const result = await citiesService.getCityById(req.tenantId, req.params.id, req.auth);

  return apiResponse(res, {
    message: 'City fetched successfully.',
    data: result,
  });
});

export const updateCity = asyncHandler(async (req, res) => {
  const result = await citiesService.updateCity(req.tenantId, req.params.id, req.body, req.auth);

  return apiResponse(res, {
    message: 'City updated successfully.',
    data: result,
  });
});

export const deactivateCity = asyncHandler(async (req, res) => {
  const result = await citiesService.deactivateCity(req.tenantId, req.params.id, req.auth);

  return apiResponse(res, {
    message: 'City deactivated successfully.',
    data: result,
  });
});
