import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createCityValidationSchema), createCity);
router.get('/', validate(listCitiesValidationSchema), getCities);
router.get('/:id', validate(cityIdValidationSchema), getCityById);
router.patch('/:id', validate(updateCityValidationSchema), updateCity);
router.patch('/:id/deactivate', validate(cityIdValidationSchema), deactivateCity);

export { router as citiesRoutes };
