import { Router } from 'express';
import { commissionTiersRoutes } from './commission-tiers/commissionTiers.routes.js';
import { affiliateSettingsRoutes } from './settings/affiliateSettings.routes.js';
import { affiliateOverviewRoutes } from './overview/affiliateOverview.routes.js';
import { affiliateWalletRoutes } from './wallet/affiliateWallet.routes.js';
import { affiliateWithdrawalsRoutes } from './withdrawals/affiliateWithdrawals.routes.js';
import { commissionReconciliationRoutes } from './commissions/commissionReconciliation.routes.js';

const router = Router();

router.use('/commission-tiers', commissionTiersRoutes);
router.use('/settings', affiliateSettingsRoutes);
router.use('/overview', affiliateOverviewRoutes);
router.use('/wallet', affiliateWalletRoutes);
router.use('/withdrawals', affiliateWithdrawalsRoutes);
router.use('/commission-reconciliation', commissionReconciliationRoutes);

export { router as affiliateRoutes };
