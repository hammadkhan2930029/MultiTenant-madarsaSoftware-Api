import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deactivateSection,
} from './sections.controller.js';
import {
  createSectionValidationSchema,
  listSectionsValidationSchema,
  sectionIdValidationSchema,
  updateSectionValidationSchema,
} from './sections.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createSectionValidationSchema), createSection);
router.get('/', validate(listSectionsValidationSchema), getSections);
router.get('/:id', validate(sectionIdValidationSchema), getSectionById);
router.patch('/:id', validate(updateSectionValidationSchema), updateSection);
router.patch('/:id/deactivate', validate(sectionIdValidationSchema), deactivateSection);

export { router as sectionsRoutes };
