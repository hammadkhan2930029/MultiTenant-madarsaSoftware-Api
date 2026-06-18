import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
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

router.post('/', validate(createUserValidationSchema), createUser);
router.get('/', validate(listUsersValidationSchema), getUsers);
router.get('/:id', validate(userIdValidationSchema), getUserById);
router.patch('/:id', validate(updateUserValidationSchema), updateUser);

export { router as usersRoutes };
