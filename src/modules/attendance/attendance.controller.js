import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { attendanceService } from './attendance.service.js';

export const markStudentAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.markStudentAttendance(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Student attendance saved successfully.',
    data: attendance,
  });
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  const attendances = await attendanceService.getStudentAttendance(req.query);

  return apiResponse(res, {
    message: 'Student attendance fetched successfully.',
    data: attendances,
  });
});

export const markTeacherAttendance = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.markTeacherAttendance(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Teacher attendance saved successfully.',
    data: attendance,
  });
});

export const getTeacherAttendance = asyncHandler(async (req, res) => {
  const attendances = await attendanceService.getTeacherAttendance(req.query);

  return apiResponse(res, {
    message: 'Teacher attendance fetched successfully.',
    data: attendances,
  });
});
