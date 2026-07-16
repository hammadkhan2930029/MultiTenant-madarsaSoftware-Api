import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditLogsService } from './auditLogs.service.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditLogsService.getAuditLogs(req.auth, req.query);

  return apiResponse(res, {
    message: 'Audit logs fetched successfully.',
    data: result,
  });
});
