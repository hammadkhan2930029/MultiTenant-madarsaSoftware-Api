import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { blockBranchScopedPermissionManagement, requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getPermissions,
  getRoleById,
  getRolePermissions,
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
router.use(blockBranchScopedPermissionManagement);

router.post('/', requireAnyPermission('roles.manage'), validate(createRoleValidationSchema), createRole);
router.get('/', requireAnyPermission('roles.view'), validate(listRolesValidationSchema), getRoles);
router.get('/permissions', requireAnyPermission('roles.view', 'roles.manage'), getPermissions);
router.get('/:id/permissions', requireAnyPermission('roles.view', 'roles.manage'), validate(roleIdValidationSchema), getRolePermissions);
router.get('/:id', requireAnyPermission('roles.view'), validate(roleIdValidationSchema), getRoleById);
router.patch('/:id', requireAnyPermission('roles.manage'), validate(updateRoleValidationSchema), updateRole);
router.put('/:id', requireAnyPermission('roles.manage'), validate(updateRoleValidationSchema), updateRole);
router.delete('/:id', requireAnyPermission('roles.manage'), validate(roleIdValidationSchema), deleteRole);
router.put('/:id/permissions', requireAnyPermission('roles.manage'), validate(assignRolePermissionsValidationSchema), assignRolePermissions);

export { router as rolesRoutes };
