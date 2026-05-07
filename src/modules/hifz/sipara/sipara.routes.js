import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createSiparaValidationSchema), createSiparaEntry);
router.get('/', validate(listSiparaValidationSchema), getSiparaEntries);
router.get('/:id', validate(siparaIdValidationSchema), getSiparaEntryById);
router.put('/:id', validate(updateSiparaValidationSchema), updateSiparaEntry);
router.patch('/:id/deactivate', validate(siparaIdValidationSchema), deactivateSiparaEntry);

export { router as siparaHifzRoutes };
