import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createSection,
  bulkCreateSections,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
} from './sections.controller.js';
import {
  bulkCreateSectionsValidationSchema,
  createSectionValidationSchema,
  listSectionsValidationSchema,
  sectionIdValidationSchema,
  updateSectionValidationSchema,
} from './sections.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requirePermission('sections.create'), validate(createSectionValidationSchema), createSection);
router.post('/bulk', requirePermission('sections.create'), validate(bulkCreateSectionsValidationSchema), bulkCreateSections);
router.get('/', requirePermission('sections.view'), validate(listSectionsValidationSchema), getSections);
router.get('/:id', requirePermission('sections.view'), validate(sectionIdValidationSchema), getSectionById);
router.patch('/:id', requirePermission('sections.update'), validate(updateSectionValidationSchema), updateSection);
router.delete('/:id', requirePermission('sections.delete'), validate(sectionIdValidationSchema), deleteSection);

export { router as sectionsRoutes };
