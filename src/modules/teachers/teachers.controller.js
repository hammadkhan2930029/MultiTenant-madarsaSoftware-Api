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
    message: 'Teacher created successfully.',
    data: teacher,
  });
});

export const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await teachersService.getTeachers(req.query);

  return apiResponse(res, {
    message: 'Teachers fetched successfully.',
    data: teachers,
  });
});

export const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await teachersService.getTeacherById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Teacher profile fetched successfully.',
    data: teacher,
  });
});

export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await teachersService.updateTeacher(Number(req.params.id), {
    body: req.body,
    file: req.file,
  });

  return apiResponse(res, {
    message: 'Teacher updated successfully.',
    data: teacher,
  });
});

export const updateTeacherStatus = asyncHandler(async (req, res) => {
  const teacher = await teachersService.updateTeacherStatus(Number(req.params.id), req.body.status);

  return apiResponse(res, {
    message: 'Teacher status updated successfully.',
    data: teacher,
  });
});
