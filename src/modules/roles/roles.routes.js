import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getPermissions,
  getRoleById,
  getRoles,
  updateRole,
} from './roles.controller.js';
import {
  assignRolePermissionsValidationSchema,
  createRoleValidationSchema,
  listRolesValidationSchema,
  roleIdValidationSchema,
  updateRoleValidationSchema,
} from './roles.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createRoleValidationSchema), createRole);
router.get('/', validate(listRolesValidationSchema), getRoles);
router.get('/permissions', getPermissions);
router.get('/:id', validate(roleIdValidationSchema), getRoleById);
router.patch('/:id', validate(updateRoleValidationSchema), updateRole);
router.delete('/:id', validate(roleIdValidationSchema), deleteRole);
router.put('/:id/permissions', validate(assignRolePermissionsValidationSchema), assignRolePermissions);

export { router as rolesRoutes };
