import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createSuggestion, getSuggestions } from './suggestions.controller.js';
import {
  createSuggestionValidationSchema,
  listSuggestionsValidationSchema,
} from './suggestions.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('suggestions.create'), validate(createSuggestionValidationSchema), createSuggestion);
router.get('/', requirePermission('suggestions.view'), validate(listSuggestionsValidationSchema), getSuggestions);

export { router as suggestionsRoutes };
