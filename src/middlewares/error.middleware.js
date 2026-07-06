import { env } from '../config/env.js';
import { apiResponse } from '../utils/apiResponse.js';

const allowedOrigins = new Set(env.appOrigins);

export const errorMiddleware = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin) && !res.headersSent) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.vary('Origin');
  }

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
