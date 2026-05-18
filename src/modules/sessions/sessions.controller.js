import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sessionsService } from './sessions.service.js';

export const createSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.createSession(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Session created successfully.',
    data: session,
  });
});

export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionsService.getSessions(req.query);

  return apiResponse(res, {
    message: 'Sessions fetched successfully.',
    data: sessions,
  });
});

export const getSessionById = asyncHandler(async (req, res) => {
  const session = await sessionsService.getSessionById(Number(req.params.id));

  return apiResponse(res, {
    message: 'Session fetched successfully.',
    data: session,
  });
});

export const updateSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.updateSession(Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Session updated successfully.',
    data: session,
  });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const session = await sessionsService.deleteSession(Number(req.params.id));

  return apiResponse(res, {
    message: 'Session deleted successfully.',
    data: session,
  });
});
