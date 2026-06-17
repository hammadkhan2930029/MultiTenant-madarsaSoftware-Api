import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSuggestion, getSuggestions } from './suggestions.controller.js';
import {
  createSuggestionValidationSchema,
  listSuggestionsValidationSchema,
} from './suggestions.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createSuggestionValidationSchema), createSuggestion);
router.get('/', validate(listSuggestionsValidationSchema), getSuggestions);

export { router as suggestionsRoutes };
