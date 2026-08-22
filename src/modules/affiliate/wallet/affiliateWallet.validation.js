import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const accountBody = z.object({
  accountType: z.enum(['bank', 'easypaisa', 'jazzcash', 'other']),
  accountTitle: z.string().trim().min(1).max(150),
  institutionName: optionalText(150),
  accountNumber: optionalText(100),
  iban: optionalText(100),
  walletPhone: optionalText(50),
  branchName: optionalText(150),
  instructions: optionalText(500),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).superRefine((value, ctx) => {
  if (value.accountType === 'bank' && !value.accountNumber && !value.iban) ctx.addIssue({ code: 'custom', path: ['accountNumber'], message: 'Account number or IBAN is required.' });
  if (['easypaisa', 'jazzcash'].includes(value.accountType) && !value.walletPhone) ctx.addIssue({ code: 'custom', path: ['walletPhone'], message: 'Wallet phone number is required.' });
});

export const createWalletAccountSchema = z.object({ body: accountBody });
export const updateWalletAccountSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }), body: accountBody });
export const walletAccountIdSchema = z.object({ params: z.object({ id: z.coerce.number().int().positive() }) });

export const createWithdrawalRequestSchema = z.object({
  body: z.object({
    paymentAccountId: z.coerce.number().int().positive(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3,10}$/),
    amount: z.union([
      z.coerce.number().positive().max(9999999999.99),
      z.literal('').transform(() => null),
      z.null(),
    ]).optional().nullable(),
    requestNote: z.string().trim().max(500).optional().nullable(),
  }),
});
