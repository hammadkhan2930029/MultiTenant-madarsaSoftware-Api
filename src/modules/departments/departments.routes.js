import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requirePermission } from '../../middlewares/authorization.middleware.js';
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

router.post('/', requirePermission('settings.update'), validate(createDepartmentValidationSchema), createDepartment);
router.get('/', requirePermission('settings.view'), validate(listDepartmentsValidationSchema), getDepartments);
router.get('/:id', requirePermission('settings.view'), validate(departmentIdValidationSchema), getDepartmentById);
router.patch('/:id', requirePermission('settings.update'), validate(updateDepartmentValidationSchema), updateDepartment);
router.delete('/:id', requirePermission('settings.update'), validate(departmentIdValidationSchema), deleteDepartment);

export { router as departmentsRoutes };
