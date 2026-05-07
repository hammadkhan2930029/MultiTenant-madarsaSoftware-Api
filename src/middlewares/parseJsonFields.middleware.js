import { AppError } from '../utils/appError.js';

export const parseJsonFields = (fieldNames = []) => (req, _res, next) => {
  try {
    for (const fieldName of fieldNames) {
      const value = req.body[fieldName];

      if (typeof value === 'string' && value.trim() !== '') {
        req.body[fieldName] = JSON.parse(value);
      }
    }

    next();
  } catch {
    next(new AppError('Invalid JSON format in multipart form fields.', 400));
  }
};
