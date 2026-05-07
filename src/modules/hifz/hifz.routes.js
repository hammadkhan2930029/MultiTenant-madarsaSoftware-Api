import { Router } from 'express';
import { dailyHifzRoutes } from './daily/daily.routes.js';
import { weeklyHifzRoutes } from './weekly/weekly.routes.js';
import { monthlyHifzRoutes } from './monthly/monthly.routes.js';
import { siparaHifzRoutes } from './sipara/sipara.routes.js';

const router = Router();

router.use('/daily', dailyHifzRoutes);
router.use('/weekly', weeklyHifzRoutes);
router.use('/monthly', monthlyHifzRoutes);
router.use('/sipara', siparaHifzRoutes);

export { router as hifzRoutes };
