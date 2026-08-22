import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requireTenantAdmin, requireTenantContext } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { createAccount, createWithdrawalRequest, deactivateAccount, getWallet, updateAccount } from './affiliateWallet.controller.js';
import { createWalletAccountSchema, createWithdrawalRequestSchema, updateWalletAccountSchema, walletAccountIdSchema } from './affiliateWallet.validation.js';

const router = Router();
router.use(authMiddleware, requireTenantContext, requireTenantAdmin);
router.get('/', getWallet);
router.post('/accounts', validate(createWalletAccountSchema), createAccount);
router.put('/accounts/:id', validate(updateWalletAccountSchema), updateAccount);
router.patch('/accounts/:id/deactivate', validate(walletAccountIdSchema), deactivateAccount);
router.post('/withdrawals', validate(createWithdrawalRequestSchema), createWithdrawalRequest);
export { router as affiliateWalletRoutes };
