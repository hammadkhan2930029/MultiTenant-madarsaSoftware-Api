import { z } from 'zod';

const getCnicDigits = (value = '') =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 13);

const formatCnicDigits = (digits) => `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;

export const optionalCnicField = (message = 'شناختی کارڈ نمبر 00000-0000000-0 کے فارمیٹ میں درج کریں۔') =>
  z
    .union([z.string(), z.literal(''), z.undefined(), z.null()])
    .transform((value) => {
      const rawValue = String(value || '').trim();
      if (!rawValue) return undefined;

      return {
        rawValue,
        digits: getCnicDigits(rawValue),
      };
    })
    .refine((value) => value === undefined || value.digits.length === 13, { message })
    .transform((value) => (value === undefined ? undefined : formatCnicDigits(value.digits)));
