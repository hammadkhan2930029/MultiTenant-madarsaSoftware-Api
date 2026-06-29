import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { schedulesService } from './schedules.service.js';

export const createSchedule = asyncHandler(async (req, res) => {
  const schedule = await schedulesService.createSchedule(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Schedule saved successfully.',
    data: schedule,
  });
});

export const getSchedules = asyncHandler(async (req, res) => {
  const schedules = await schedulesService.getSchedules(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Schedules fetched successfully.',
    data: schedules,
  });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await schedulesService.updateSchedule(req.tenantId, Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Schedule updated successfully.',
    data: schedule,
  });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await schedulesService.deleteSchedule(req.tenantId, Number(req.params.id));

  return apiResponse(res, {
    message: 'Schedule removed successfully.',
    data: schedule,
  });
});
