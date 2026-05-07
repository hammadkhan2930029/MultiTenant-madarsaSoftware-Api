export const apiResponse = (
  res,
  {
    success = true,
    statusCode = 200,
    message = 'Request completed successfully.',
    data = null,
  } = {}
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};
