import { z } from 'zod';

export const PHONE_VALIDATION_MESSAGE = 'موبائل نمبر 11 ہندسوں میں 03XXXXXXXXX یا کنٹری کوڈ کے ساتھ +923XXXXXXXXX درج کریں۔';

export const normalizePhoneNumber = (value) => {
  const compact = String(value ?? '').trim().replace(/[\s\-()]/g, '');
  return compact.startsWith('0092') ? `+92${compact.slice(4)}` : compact;
};

export const isValidPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  if (!phone) return true;
  return /^03\d{9}$/.test(phone) || /^\+923\d{9}$/.test(phone);
};

export const optionalPhoneField = () => z
  .union([z.string(), z.null(), z.undefined()])
  .transform(normalizePhoneNumber)
  .refine((value) => !value || isValidPhoneNumber(value), PHONE_VALIDATION_MESSAGE)
  .transform((value) => value || undefined);

export const requiredPhoneField = (requiredMessage = 'موبائل نمبر درج کرنا ضروری ہے۔') => z
  .string({ required_error: requiredMessage, invalid_type_error: PHONE_VALIDATION_MESSAGE })
  .transform(normalizePhoneNumber)
  .refine(Boolean, requiredMessage)
  .refine((value) => !value || isValidPhoneNumber(value), PHONE_VALIDATION_MESSAGE);
