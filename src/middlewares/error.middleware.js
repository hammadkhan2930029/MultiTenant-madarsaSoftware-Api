import { apiResponse } from '../utils/apiResponse.js';

export const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }

  return apiResponse(res, {
    success: false,
    statusCode,
    message,
    data: error.details || null,
  });
};
