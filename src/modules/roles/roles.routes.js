import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission, requireSuperAdmin } from '../../middlewares/authorization.middleware.js';
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

router.use(authMiddleware, requireSuperAdmin);

router.post('/', requireAnyPermission('roles.create'), validate(createRoleValidationSchema), createRole);
router.get('/', requireAnyPermission('roles.view'), validate(listRolesValidationSchema), getRoles);
router.get('/permissions', requireAnyPermission('roles.view', 'roles.create', 'roles.edit'), getPermissions);
router.get('/:id', requireAnyPermission('roles.view'), validate(roleIdValidationSchema), getRoleById);
router.patch('/:id', requireAnyPermission('roles.edit'), validate(updateRoleValidationSchema), updateRole);
router.delete('/:id', requireAnyPermission('roles.delete'), validate(roleIdValidationSchema), deleteRole);
router.put('/:id/permissions', requireAnyPermission('roles.edit'), validate(assignRolePermissionsValidationSchema), assignRolePermissions);

export { router as rolesRoutes };
