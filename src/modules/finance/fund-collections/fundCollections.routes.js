import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
import { requirePermission } from '../../../middlewares/authorization.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import {
  createFundCollection,
  getFundCollections,
  getFundCollectionById,
  updateFundCollection,
  deactivateFundCollection,
} from './fundCollections.controller.js';
import {
  createFundCollectionValidationSchema,
  listFundCollectionsValidationSchema,
  fundCollectionIdValidationSchema,
  updateFundCollectionValidationSchema,
} from './fundCollections.validation.js';

const router = Router();
router.use(authMiddleware);
router.post('/', requirePermission('funds.create'), validate(createFundCollectionValidationSchema), createFundCollection);
router.get('/', requirePermission('funds.view', 'funds.create'), validate(listFundCollectionsValidationSchema), getFundCollections);
router.get('/:id', requirePermission('funds.view', 'funds.create'), validate(fundCollectionIdValidationSchema), getFundCollectionById);
router.put('/:id', requirePermission('funds.edit', 'funds.create'), validate(updateFundCollectionValidationSchema), updateFundCollection);
router.patch('/:id/deactivate', requirePermission('funds.delete', 'funds.create'), validate(fundCollectionIdValidationSchema), deactivateFundCollection);

export { router as fundCollectionsRoutes };
