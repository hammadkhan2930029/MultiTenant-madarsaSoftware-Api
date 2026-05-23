import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { teachersService } from './teachers.service.js';

export const createTeacher = asyncHandler(async (req, res) => {
  const teacher = await teachersService.createTeacher({
    body: req.body,
    file: req.file,
  });

  return apiResponse(res, {
    statusCode: 201,
    message: 'استاد کامیابی سے شامل ہو گیا۔',
    data: teacher,
  });
});

export const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await teachersService.getTeachers(req.query);

  return apiResponse(res, {
    message: 'اساتذہ کامیابی سے لوڈ ہو گئے۔',
    data: teachers,
  });
});

export const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await teachersService.getTeacherById(Number(req.params.id));

  return apiResponse(res, {
    message: 'استاد کی تفصیل کامیابی سے لوڈ ہو گئی۔',
    data: teacher,
  });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await teachersService.updateTeacher(Number(req.params.id), {
    body: req.body,
    file: req.file,
  });

  return apiResponse(res, {
    message: 'استاد کی معلومات کامیابی سے تبدیل ہو گئیں۔',
    data: teacher,
  });
});

export const updateTeacherStatus = asyncHandler(async (req, res) => {
  const teacher = await teachersService.updateTeacherStatus(Number(req.params.id), req.body.status);

  return apiResponse(res, {
    message: 'استاد کی حالت کامیابی سے تبدیل ہو گئی۔',
    data: teacher,
  });
});

export const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await teachersService.deleteTeacher(Number(req.params.id));

  return apiResponse(res, {
    message: 'استاد کامیابی سے حذف کر دیا گیا۔',
    data: teacher,
  });
});
