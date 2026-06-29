import { apiResponse } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sectionsService } from './sections.service.js';

export const createSection = asyncHandler(async (req, res) => {
  const section = await sectionsService.createSection(req.tenantId, req.body);

  return apiResponse(res, {
    statusCode: 201,
    message: 'Section created successfully.',
    data: section,
  });
});

export const getSections = asyncHandler(async (req, res) => {
  const sections = await sectionsService.getSections(req.tenantId, req.query);

  return apiResponse(res, {
    message: 'Sections fetched successfully.',
    data: sections,
  });
});

export const getSectionById = asyncHandler(async (req, res) => {
  const section = await sectionsService.getSectionById(req.tenantId, Number(req.params.id));

  return apiResponse(res, {
    message: 'Section fetched successfully.',
    data: section,
  });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await sectionsService.updateSection(req.tenantId, Number(req.params.id), req.body);

  return apiResponse(res, {
    message: 'Section updated successfully.',
    data: section,
  });
});

export const deleteSection = asyncHandler(async (req, res) => {
  const section = await sectionsService.deleteSection(req.tenantId, Number(req.params.id));

  return apiResponse(res, {
    message: 'Section deleted successfully.',
    data: section,
  });
});
