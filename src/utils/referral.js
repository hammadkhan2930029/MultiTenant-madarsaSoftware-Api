import { env } from '../config/env.js';

export const buildReferralLink = (referralCode) => {
  if (!referralCode) return null;

  const url = new URL(env.referralPublicBaseUrl);
  url.searchParams.set('ref', referralCode);
  return url.toString();
};
