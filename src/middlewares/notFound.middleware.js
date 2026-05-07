import { apiResponse } from '../utils/apiResponse.js';

export const notFoundMiddleware = (req, res) => {
  return apiResponse(res, {
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.originalUrl}`,
    data: null,
  });
};
