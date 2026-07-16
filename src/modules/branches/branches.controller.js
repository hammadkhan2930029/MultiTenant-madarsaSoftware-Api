import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditService } from '../security/index.js';
import { branchesService } from './branches.service.js';

export const createBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.createBranch(
    req.tenantId,
    req.body,
    req.admin,
    auditService.buildRequestAuditContext(req)
  );

  return apiResponse(res, {
    statusCode: 201,
    message: 'Branch created successfully.',
    data: branch,
  });
});

export const getBranches = asyncHandler(async (req, res) => {
  const branches = await branchesService.getBranches(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Branches fetched successfully.',
    data: branches,
  });
});

export const getBranchById = asyncHandler(async (req, res) => {
  const branch = await branchesService.getBranchById(req.tenantId, Number(req.params.id));

  return apiResponse(res, {
    message: 'Branch fetched successfully.',
    data: branch,
  });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.updateBranch(
    req.tenantId,
    Number(req.params.id),
    req.body,
    req.admin,
    auditService.buildRequestAuditContext(req)
  );

  return apiResponse(res, {
    message: 'Branch updated successfully.',
    data: branch,
  });
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await branchesService.deleteBranch(
    req.tenantId,
    Number(req.params.id),
    req.admin,
    auditService.buildRequestAuditContext(req)
  );

  return apiResponse(res, {
    message: 'Branch deleted successfully.',
    data: branch,
  });
});

export const getLegacyMigrationSummary = asyncHandler(async (req, res) => {
  const summary = await branchesService.getLegacyMigrationSummary(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Legacy branch migration summary fetched successfully.',
    data: summary,
  });
});

export const getLegacyMigrationPreview = asyncHandler(async (req, res) => {
  const preview = await branchesService.getLegacyMigrationPreview(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Legacy branch migration preview fetched successfully.',
    data: preview,
  });
});

export const getLegacyMigrationStatus = asyncHandler(async (req, res) => {
  const status = await branchesService.getLegacyMigrationStatus(req.tenantId);

  return apiResponse(res, {
    message: 'Legacy branch migration status fetched successfully.',
    data: status,
  });
});

export const migrateLegacyDataToMainBranch = asyncHandler(async (req, res) => {
  const result = await branchesService.migrateLegacyDataToMainBranch(
    req.tenantId,
    req.body,
    req.admin,
    auditService.buildRequestAuditContext(req)
  );

  return apiResponse(res, {
    message: 'Legacy records assigned to main branch successfully.',
    data: result,
  });
});

export const executeLegacyMigration = migrateLegacyDataToMainBranch;
