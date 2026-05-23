import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { teacherSchedulesService } from './teacher-schedules.service.js';

export const createTeacherSchedule = asyncHandler(async (req, res) => {
  const schedule = await teacherSchedulesService.createTeacherSchedule(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Teacher schedule saved successfully.',
    data: schedule,
  });
});

export const getTeacherSchedules = asyncHandler(async (req, res) => {
  const schedules = await teacherSchedulesService.getTeacherSchedules(req.query);

  return apiResponse(res, {
    message: 'Teacher schedules fetched successfully.',
    data: schedules,
  });
});

export const deleteTeacherSchedule = asyncHandler(async (req, res) => {
  const schedule = await teacherSchedulesService.deleteTeacherSchedule(Number(req.params.id));

  return apiResponse(res, {
    message: 'Teacher schedule removed successfully.',
    data: schedule,
  });
});
