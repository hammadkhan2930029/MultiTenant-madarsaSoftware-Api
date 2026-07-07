import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createCity,
  deactivateCity,
  getCities,
  getCityById,
  updateCity,
} from './cities.controller.js';
import {
  cityIdValidationSchema,
  createCityValidationSchema,
  listCitiesValidationSchema,
  updateCityValidationSchema,
} from './cities.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('settings.update'), validate(createCityValidationSchema), createCity);
router.get('/', requirePermission('settings.view'), validate(listCitiesValidationSchema), getCities);
router.get('/:id', requirePermission('settings.view'), validate(cityIdValidationSchema), getCityById);
router.patch('/:id', requirePermission('settings.update'), validate(updateCityValidationSchema), updateCity);
router.patch('/:id/deactivate', requirePermission('settings.update'), validate(cityIdValidationSchema), deactivateCity);

export { router as citiesRoutes };
