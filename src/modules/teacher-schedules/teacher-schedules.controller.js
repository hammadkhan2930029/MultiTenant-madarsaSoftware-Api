import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { teacherSchedulesService } from './teacher-schedules.service.js';

export const createTeacherSchedule = asyncHandler(async (req, res) => {
  const schedule = await teacherSchedulesService.createTeacherSchedule(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'استاد کا شیڈول کامیابی سے محفوظ ہو گیا۔',
    data: schedule,
  });
});

export const getTeacherSchedules = asyncHandler(async (req, res) => {
  const schedules = await teacherSchedulesService.getTeacherSchedules(req.query);

  return apiResponse(res, {
    message: 'اساتذہ کے شیڈول کامیابی سے لوڈ ہو گئے۔',
    data: schedules,
  });
});

export const deleteTeacherSchedule = asyncHandler(async (req, res) => {
  const schedule = await teacherSchedulesService.deleteTeacherSchedule(Number(req.params.id));

  return apiResponse(res, {
    message: 'استاد کا شیڈول کامیابی سے ختم کر دیا گیا۔',
    data: schedule,
  });
});
