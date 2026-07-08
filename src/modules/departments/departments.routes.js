import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
} from './departments.controller.js';
import {
  createDepartmentValidationSchema,
  departmentIdValidationSchema,
  listDepartmentsValidationSchema,
  updateDepartmentValidationSchema,
} from './departments.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requireAnyPermission('settings.departments.create', 'settings.update', 'settings.edit'), validate(createDepartmentValidationSchema), createDepartment);
router.get('/', requireAnyPermission('settings.departments.view', 'settings.view'), validate(listDepartmentsValidationSchema), getDepartments);
router.get('/:id', requireAnyPermission('settings.departments.view', 'settings.view'), validate(departmentIdValidationSchema), getDepartmentById);
router.patch('/:id', requireAnyPermission('settings.departments.update', 'settings.update', 'settings.edit'), validate(updateDepartmentValidationSchema), updateDepartment);
router.delete('/:id', requireAnyPermission('settings.departments.delete', 'settings.update', 'settings.edit'), validate(departmentIdValidationSchema), deleteDepartment);

export { router as departmentsRoutes };
