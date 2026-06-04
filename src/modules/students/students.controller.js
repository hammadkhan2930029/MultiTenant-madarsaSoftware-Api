import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { studentsService } from './students.service.js';

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.createStudent({
    body: req.body,
    file: req.file,
  });

  return apiResponse(res, {
    statusCode: 201,
    message: 'Student admission completed successfully.',
    data: student,
  });
});

export const getStudents = asyncHandler(async (req, res) => {
  const students = await studentsService.getStudents(req.query);

  return apiResponse(res, {
    message: 'Students fetched successfully.',
    data: students,
  });
});

export const getNextAdmissionNumber = asyncHandler(async (req, res) => {
  const nextAdmissionNumber = await studentsService.getNextAdmissionNumber();

  return apiResponse(res, {
    message: 'Next admission number fetched successfully.',
    data: nextAdmissionNumber,
  });
});

export const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentsService.getStudentById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Student profile fetched successfully.',
    data: student,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.updateStudent(Number(req.params.id), {
    body: req.body,
    file: req.file,
  });

  return apiResponse(res, {
    message: 'Student updated successfully.',
    data: student,
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await studentsService.deleteStudent(Number(req.params.id));

  return apiResponse(res, {
    message: 'Student deleted successfully.',
    data: student,
  });
});

export const assignClassToStudent = asyncHandler(async (req, res) => {
  const assignment = await studentsService.assignClassToStudent(Number(req.params.id), req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Student assigned to class successfully.',
    data: assignment,
  });
});

export const removeClassAssignment = asyncHandler(async (req, res) => {
  const assignment = await studentsService.removeClassAssignment(Number(req.params.assignmentId));

  return apiResponse(res, {
    message: 'Student class assignment removed successfully.',
    data: assignment,
  });
});
