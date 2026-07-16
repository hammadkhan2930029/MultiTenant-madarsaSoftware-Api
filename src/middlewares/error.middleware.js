import { env } from '../config/env.js';
import { apiResponse } from '../utils/apiResponse.js';
import fs from 'fs';

const allowedOrigins = new Set(env.appOrigins);

const collectUploadedFiles = (req) => {
  const files = [];
  if (req.file) files.push(req.file);

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((value) => {
      if (Array.isArray(value)) files.push(...value);
      else if (value) files.push(value);
    });
  }

  return files.filter((file) => file?.path);
};

const cleanupFailedUploadFiles = (req) => {
  collectUploadedFiles(req).forEach((file) => {
    try {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (cleanupError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(cleanupError);
      }
    }
  });
};

export const errorMiddleware = (error, req, res, _next) => {
  const isPrismaError = typeof error.code === 'string' && error.code.startsWith('P');
  const statusCode = isPrismaError ? 400 : error.statusCode || 500;
  const message = isPrismaError
    ? 'درخواست مکمل نہیں ہو سکی۔ درج کردہ معلومات دوبارہ چیک کریں۔'
    : error.message || 'Internal server error';
  const origin = req.headers.origin;

  cleanupFailedUploadFiles(req);

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
    data: isPrismaError ? null : error.details || null,
  });
};
