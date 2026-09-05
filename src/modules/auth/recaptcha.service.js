import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const verifyRecaptchaToken = async (
  token,
  remoteIp = null,
  options = {},
) => {
  const enabled = options.enabled ?? env.recaptchaEnabled;
  if (!enabled) return { success: true, skipped: true };

  const secretKey = options.secretKey ?? env.recaptchaSecretKey;
  if (!secretKey) {
    throw new AppError('reCAPTCHA سروس درست طریقے سے کنفیگر نہیں ہے۔', 503);
  }
  if (!String(token || '').trim()) {
    throw new AppError('براہ کرم تصدیق کریں کہ آپ روبوٹ نہیں ہیں۔', 400);
  }

  const body = new URLSearchParams({
    secret: secretKey,
    response: String(token).trim(),
  });
  if (remoteIp) body.set('remoteip', String(remoteIp));

  let verification;
  try {
    const response = await (options.fetchImpl || fetch)(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Google verification returned ${response.status}`);
    verification = await response.json();
  } catch {
    throw new AppError('reCAPTCHA تصدیق عارضی طور پر دستیاب نہیں۔ دوبارہ کوشش کریں۔', 503);
  }

  if (!verification?.success) {
    throw new AppError('reCAPTCHA تصدیق ناکام یا ختم ہو چکی ہے۔ دوبارہ تصدیق کریں۔', 400);
  }

  return verification;
};
