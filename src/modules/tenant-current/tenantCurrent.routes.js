import { Router } from 'express';
import { getCurrentTenant } from './tenantCurrent.controller.js';

const router = Router();

router.get('/current', getCurrentTenant);

export { router as tenantCurrentRoutes };
