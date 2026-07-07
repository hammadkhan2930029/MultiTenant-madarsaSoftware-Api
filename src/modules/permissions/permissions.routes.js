import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireAnyPermission } from '../../middlewares/authorization.middleware.js';
import { getGroupedPermissions, getPermissions } from './permissions.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireAnyPermission('roles.manage', 'roles.view'));

router.get('/', getPermissions);
router.get('/grouped', getGroupedPermissions);

export { router as permissionsRoutes };
