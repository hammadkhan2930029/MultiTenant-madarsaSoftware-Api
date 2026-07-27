import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sessionsService } from './sessions.service.js';

export const createSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.createSession(req.tenantId, req.body, req.branchScope);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Session created successfully.',
    data: session,
  });
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionsService.getSessions(req.tenantId, req.query, req.branchScope);

  return apiResponse(res, {
    message: 'Sessions fetched successfully.',
    data: sessions,
  });
});

export const getSessionById = asyncHandler(async (req, res) => {
  const session = await sessionsService.getSessionById(req.tenantId, Number(req.params.id), req.branchScope);

  return apiResponse(res, {
    message: 'Session fetched successfully.',
    data: session,
  });
});

export const updateSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.updateSession(req.tenantId, Number(req.params.id), req.body, req.branchScope);

  return apiResponse(res, {
    message: 'Session updated successfully.',
    data: session,
  });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.deleteSession(req.tenantId, Number(req.params.id), req.branchScope);

  return apiResponse(res, {
    message: 'Session deleted successfully.',
    data: session,
  });
});
