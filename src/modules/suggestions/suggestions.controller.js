import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { suggestionsService } from './suggestions.service.js';

export const createSuggestion = asyncHandler(async (req, res) => {
  const result = await suggestionsService.createSuggestion(req.tenantId, req.body, req.admin);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Suggestion submitted successfully.',
    data: result,
  });
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const result = await suggestionsService.getSuggestions(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Suggestions fetched successfully.',
    data: result,
  });
});
