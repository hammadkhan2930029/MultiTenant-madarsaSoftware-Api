import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createDepartmentValidationSchema), createDepartment);
router.get('/', validate(listDepartmentsValidationSchema), getDepartments);
router.get('/:id', validate(departmentIdValidationSchema), getDepartmentById);
router.patch('/:id', validate(updateDepartmentValidationSchema), updateDepartment);
router.delete('/:id', validate(departmentIdValidationSchema), deleteDepartment);

export { router as departmentsRoutes };
