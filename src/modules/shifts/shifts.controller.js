import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { shiftsService } from './shifts.service.js';

export const createShift = asyncHandler(async (req, res) => {
  const result = await shiftsService.createShift(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Shift created successfully.',
    data: result,
  });
});

export const getShifts = asyncHandler(async (req, res) => {
  const result = await shiftsService.getShifts(req.query);

  return apiResponse(res, {
    message: 'Shifts fetched successfully.',
    data: result,
  });
});

export const getShiftById = asyncHandler(async (req, res) => {
  const result = await shiftsService.getShiftById(req.params.id);

  return apiResponse(res, {
    message: 'Shift fetched successfully.',
    data: result,
  });
});

export const updateShift = asyncHandler(async (req, res) => {
  const result = await shiftsService.updateShift(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Shift updated successfully.',
    data: result,
  });
});

export const deleteShift = asyncHandler(async (req, res) => {
  const result = await shiftsService.deleteShift(req.params.id);

  return apiResponse(res, {
    message: 'Shift deleted successfully.',
    data: result,
  });
});
