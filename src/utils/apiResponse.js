export const apiResponse = (
  res,
  {
    success = true,
    statusCode = 200,
    message = 'Request completed successfully.',
    data = null,
    errors,
  } = {}
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...(errors && Object.keys(errors).length ? { errors } : {}),
  });
};
