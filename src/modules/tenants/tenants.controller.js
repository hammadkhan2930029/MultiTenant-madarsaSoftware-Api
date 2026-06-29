import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { tenantsService } from './tenants.service.js';

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
