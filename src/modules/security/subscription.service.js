import { AppError } from '../../utils/appError.js';

export const subscriptionService = {
  canUseFeature(_featureKey, securityContext = {}) {
    const status = securityContext.subscription?.status || 'not_configured';
    return status === 'not_configured' || status === 'active';
  },

  assertCanUseFeature(featureKey, securityContext = {}) {
    if (this.canUseFeature(featureKey, securityContext)) return;
    throw new AppError('This feature is not available in the current subscription.', 403);
  },
};
