import { AppError } from '../utils/appError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    throw new AppError('Validation failed.', 400, result.error.flatten());
  }

  req.body = result.data.body;
  req.params = result.data.params;
  req.query = result.data.query;

  next();
};
