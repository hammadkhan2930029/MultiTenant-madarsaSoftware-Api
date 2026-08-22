import { z } from 'zod';

export const listAffiliateWithdrawalsSchema = z.object({ query: z.object({
  page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['pending', 'paid', 'rejected']).optional(), search: z.string().trim().max(150).optional(),
}) });
const idParams = z.object({ id: z.coerce.number().int().positive() });
export const affiliateWithdrawalIdSchema = z.object({ params: idParams });
export const rejectAffiliateWithdrawalSchema = z.object({ params: idParams, body: z.object({ adminNote: z.string().trim().min(1).max(500) }) });
export const payAffiliateWithdrawalSchema = z.object({ params: idParams, body: z.object({
  paymentMethod: z.string().trim().min(1).max(100),
  transactionReference: z.string().trim().max(150).optional().nullable(),
  paymentDate: z.coerce.date(), note: z.string().trim().max(500).optional().nullable(),
}) });
