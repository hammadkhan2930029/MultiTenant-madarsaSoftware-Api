import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { examSchedulesService } from './exam-schedules.service.js';

export const createExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await examSchedulesService.createExamSchedule(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Exam schedule saved successfully.',
    data: schedule,
  });
});

export const getExamSchedules = asyncHandler(async (req, res) => {
  const schedules = await examSchedulesService.getExamSchedules(req.query);

  return apiResponse(res, {
    message: 'Exam schedules fetched successfully.',
    data: schedules,
  });
});

export const deleteExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await examSchedulesService.deleteExamSchedule(Number(req.params.id));

  return apiResponse(res, {
    message: 'Exam schedule removed successfully.',
    data: schedule,
  });
});
