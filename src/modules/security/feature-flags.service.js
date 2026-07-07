import { AppError } from '../../utils/appError.js';

export const featureFlagsService = {
  isEnabled(featureKey, securityContext = {}) {
    if (!featureKey) return true;
    return Boolean(securityContext.featureFlags?.[featureKey]);
  },

  assertEnabled(featureKey, securityContext = {}) {
    if (this.isEnabled(featureKey, securityContext)) return;
    throw new AppError('This feature is not enabled for this tenant.', 403);
  },
};
