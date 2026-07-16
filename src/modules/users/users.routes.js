import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { blockBranchScopedUserManagementWrites, requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { assignUserRole, createUser, deactivateUser, getUserById, getUsers, updateUser } from './users.controller.js';
import {
  assignUserRoleValidationSchema,
  createUserValidationSchema,
  listUsersValidationSchema,
  updateUserValidationSchema,
  userIdValidationSchema,
} from './users.validation.js';

const router = Router();

router.use(authMiddleware);
router.use(blockBranchScopedUserManagementWrites);

router.post('/', requireAnyPermission('users.manage'), validate(createUserValidationSchema), createUser);
router.get('/', requireAnyPermission('users.view'), validate(listUsersValidationSchema), getUsers);
router.get('/:id', requireAnyPermission('users.view'), validate(userIdValidationSchema), getUserById);
router.patch('/:id/role', requireAnyPermission('users.manage'), validate(assignUserRoleValidationSchema), assignUserRole);
router.patch('/:id', requireAnyPermission('users.manage'), validate(updateUserValidationSchema), updateUser);
router.put('/:id', requireAnyPermission('users.manage'), validate(updateUserValidationSchema), updateUser);
router.delete('/:id', requireAnyPermission('users.manage'), validate(userIdValidationSchema), deactivateUser);

export { router as usersRoutes };
