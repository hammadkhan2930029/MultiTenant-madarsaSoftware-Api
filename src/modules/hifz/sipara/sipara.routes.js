import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createSiparaEntry,
  getSiparaEntries,
  getSiparaEntryById,
  updateSiparaEntry,
  deactivateSiparaEntry,
} from './sipara.controller.js';
import {
  createSiparaValidationSchema,
  listSiparaValidationSchema,
  siparaIdValidationSchema,
  updateSiparaValidationSchema,
} from './sipara.validation.js';

const router = Router();
router.use(authMiddleware);
router.post('/', requirePermission('hifz.para.create'), validate(createSiparaValidationSchema), createSiparaEntry);
router.get('/', requirePermission('hifz.para.view'), validate(listSiparaValidationSchema), getSiparaEntries);
router.get('/:id', requirePermission('hifz.para.view'), validate(siparaIdValidationSchema), getSiparaEntryById);
router.put('/:id', requirePermission('hifz.para.create'), validate(updateSiparaValidationSchema), updateSiparaEntry);
router.patch('/:id/deactivate', requirePermission('hifz.para.create'), validate(siparaIdValidationSchema), deactivateSiparaEntry);

export { router as siparaHifzRoutes };
