import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware.js';
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
router.post('/', validate(createFundCollectionValidationSchema), createFundCollection);
router.get('/', validate(listFundCollectionsValidationSchema), getFundCollections);
router.get('/:id', validate(fundCollectionIdValidationSchema), getFundCollectionById);
router.put('/:id', validate(updateFundCollectionValidationSchema), updateFundCollection);
router.patch('/:id/deactivate', validate(fundCollectionIdValidationSchema), deactivateFundCollection);

export { router as fundCollectionsRoutes };
