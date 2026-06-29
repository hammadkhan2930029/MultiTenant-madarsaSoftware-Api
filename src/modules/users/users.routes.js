import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createUser, getUserById, getUsers, updateUser } from './users.controller.js';
import {
  createUserValidationSchema,
  listUsersValidationSchema,
  updateUserValidationSchema,
  userIdValidationSchema,
} from './users.validation.js';

const router = Router();

router.use(authMiddleware);

router.post('/', requireAnyPermission('users.create'), validate(createUserValidationSchema), createUser);
router.get('/', requireAnyPermission('users.view'), validate(listUsersValidationSchema), getUsers);
router.get('/:id', requireAnyPermission('users.view'), validate(userIdValidationSchema), getUserById);
router.patch('/:id', requireAnyPermission('users.edit'), validate(updateUserValidationSchema), updateUser);

export { router as usersRoutes };
