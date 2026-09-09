import { AppError } from '../utils/appError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const flattened = result.error.flatten();
    const fieldErrors = {};

    result.error.issues.forEach((issue) => {
      const path = issue.path
        .filter((part) => !['body', 'params', 'query'].includes(String(part)))
        .join('.');
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    });

    throw new AppError('درج کردہ معلومات درست نہیں ہیں۔', 400, { ...flattened, fieldErrors });
  }

  req.body = result.data.body;
  req.params = result.data.params;
  req.query = result.data.query;

  next();
};
