import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { examSchedulesService } from './exam-schedules.service.js';

export const createExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await examSchedulesService.createExamSchedule(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Exam schedule saved successfully.',
    data: schedule,
  });
});

export const getExamSchedules = asyncHandler(async (req, res) => {
  const schedules = await examSchedulesService.getExamSchedules(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Exam schedules fetched successfully.',
    data: schedules,
  });
});

export const updateExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await examSchedulesService.updateExamSchedule(req.tenantId, Number(req.params.id), req.body, req.branchScope);

  return apiResponse(res, {
    message: 'Exam schedule updated successfully.',
    data: schedule,
  });
});

export const deleteExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await examSchedulesService.deleteExamSchedule(req.tenantId, Number(req.params.id), req.branchScope);

  return apiResponse(res, {
    message: 'Exam schedule removed successfully.',
    data: schedule,
  });
});
