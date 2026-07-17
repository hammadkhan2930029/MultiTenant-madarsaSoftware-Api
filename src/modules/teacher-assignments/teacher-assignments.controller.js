import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditService } from '../security/index.js';
import { teacherAssignmentsService } from './teacher-assignments.service.js';

const buildRequestContext = (req) => ({
  tenantId: req.tenantId,
  adminId: req.admin?.id || req.auth?.admin?.id || null,
  branchId: req.resolvedBranchId || req.auth?.branchId || null,
  ...auditService.buildRequestAuditContext(req),
});

export const getResponsibilities = asyncHandler(async (req, res) => {
  const result = await teacherAssignmentsService.getResponsibilities(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'ذمہ داریوں کی فہرست کامیابی سے لوڈ ہو گئی۔',
    data: result,
  });
});

export const getTeacherAssignments = asyncHandler(async (req, res) => {
  const result = await teacherAssignmentsService.getTeacherAssignments(req.tenantId, req.query, req.branchScope);
  return apiResponse(res, {
    message: 'اساتذہ کی تقسیم کامیابی سے لوڈ ہو گئی۔',
    data: result,
  });
});

export const getTeacherAssignmentById = asyncHandler(async (req, res) => {
  const assignment = await teacherAssignmentsService.getTeacherAssignmentById(req.tenantId, Number(req.params.id), req.branchScope);
  return apiResponse(res, {
    message: 'تقسیم کی تفصیل کامیابی سے لوڈ ہو گئی۔',
    data: assignment,
  });
});

export const createTeacherAssignments = asyncHandler(async (req, res) => {
  const result = await teacherAssignmentsService.createTeacherAssignments(req.tenantId, req.body, buildRequestContext(req), req.branchScope);
  return apiResponse(res, {
    statusCode: 201,
    message: 'مضامین اور ذمہ داریاں کامیابی سے محفوظ ہو گئیں۔',
    data: result,
  });
});

export const updateTeacherAssignment = asyncHandler(async (req, res) => {
  const assignment = await teacherAssignmentsService.updateTeacherAssignment(req.tenantId, Number(req.params.id), req.body, buildRequestContext(req), req.branchScope);
  return apiResponse(res, {
    message: 'تقسیم کامیابی سے تبدیل ہو گئی۔',
    data: assignment,
  });
});

export const updateTeacherAssignmentStatus = asyncHandler(async (req, res) => {
  const assignment = await teacherAssignmentsService.updateTeacherAssignmentStatus(req.tenantId, Number(req.params.id), req.body.status, buildRequestContext(req), req.branchScope);
  return apiResponse(res, {
    message: 'تقسیم کی حالت کامیابی سے تبدیل ہو گئی۔',
    data: assignment,
  });
});

export const deleteTeacherAssignment = asyncHandler(async (req, res) => {
  const assignment = await teacherAssignmentsService.deleteTeacherAssignment(req.tenantId, Number(req.params.id), buildRequestContext(req), req.branchScope);
  return apiResponse(res, {
    message: 'تقسیم کامیابی سے غیر فعال کر دی گئی۔',
    data: assignment,
  });
});
