import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { auditService } from '../security/index.js';
import { tenantsService } from './tenants.service.js';

const buildRequester = (req) => ({
  admin: req.admin,
  audit: auditService.buildRequestAuditContext(req),
});

export const createTenant = asyncHandler(async (req, res) => {
  const result = await tenantsService.createTenant(req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Tenant, tenant admin, and madrassa profile created successfully.',
    data: result,
  });
});

export const getTenants = asyncHandler(async (req, res) => {
  const result = await tenantsService.getTenants(req.query);

  return apiResponse(res, {
    message: 'Tenants fetched successfully.',
    data: result,
  });
});

export const getTenantsWithBranchSettings = asyncHandler(async (req, res) => {
  const result = await tenantsService.getTenantsWithBranchSettings(req.query);

  return apiResponse(res, {
    message: 'Tenant branch settings fetched successfully.',
    data: result,
  });
});

export const getTenantBranchSummary = asyncHandler(async (req, res) => {
  const result = await tenantsService.getTenantBranchSummary(req.params.id);

  return apiResponse(res, {
    message: 'Tenant branch summary fetched successfully.',
    data: result,
  });
});

export const getTenantBranchList = asyncHandler(async (req, res) => {
  const result = await tenantsService.getTenantBranchList(req.params.id, req.query);

  return apiResponse(res, {
    message: 'Tenant branches fetched successfully.',
    data: result,
  });
});

export const updateTenantBranchSettings = asyncHandler(async (req, res) => {
  const result = await tenantsService.updateTenantBranchSettings(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'Tenant branch settings updated successfully.',
    data: result,
  });
});

export const updateTenantBranchLimit = asyncHandler(async (req, res) => {
  const result = await tenantsService.updateTenantBranchLimit(req.params.id, req.body, buildRequester(req));

  return apiResponse(res, {
    message: 'Tenant branch limit updated successfully.',
    data: result,
  });
});

export const getTenantById = asyncHandler(async (req, res) => {
  const result = await tenantsService.getTenantById(req.params.id);

  return apiResponse(res, {
    message: 'Tenant fetched successfully.',
    data: result,
  });
});

export const updateTenant = asyncHandler(async (req, res) => {
  const result = await tenantsService.updateTenant(req.params.id, req.body);

  return apiResponse(res, {
    message: 'Tenant updated successfully.',
    data: result,
  });
});
