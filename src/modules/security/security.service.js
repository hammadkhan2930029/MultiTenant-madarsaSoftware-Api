import { authorizationService } from '../rbac/authorization.service.js';
import { auditService } from './audit.service.js';
import { featureFlagsService } from './feature-flags.service.js';
import { scopedAccessService } from './scoped-access.service.js';
import { subscriptionService } from './subscription.service.js';

const enforceBusinessPrerequisites = (req, options = {}) => {
  const securityContext = req.security || {};

  if (options.permission) {
    authorizationService.assertAnyPermission(req.auth, [options.permission]);
  }

  if (options.permissions?.length) {
    authorizationService.assertAllPermissions(req.auth, options.permissions);
  }

  if (options.feature) {
    featureFlagsService.assertEnabled(options.feature, securityContext);
    subscriptionService.assertCanUseFeature(options.feature, securityContext);
  }

  if (options.branchId !== undefined) {
    scopedAccessService.assertBranchAccess(options.branchId, securityContext);
  }

  if (options.departmentId !== undefined) {
    scopedAccessService.assertDepartmentAccess(options.departmentId, securityContext);
  }
};

export const securityService = {
  auditService,
  featureFlagsService,
  scopedAccessService,
  subscriptionService,
  enforceBusinessPrerequisites,

  auditDenied(req, details = {}) {
    auditService.logAuthorizationDenied(req, details);
  },
};
