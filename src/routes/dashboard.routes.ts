import { Router } from 'express';
import { Role } from '@prisma/client';
import { DashboardController } from '../modules/dashboard/http/dashboard.controller';
import { asyncHandler } from '../shared/http/async-handler';
import { requireRoles } from '../modules/auth/http/rbac.middleware';

const router = Router();
const controller = new DashboardController();

router.get(
  '/summary',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  asyncHandler(controller.summary)
);

export { router as dashboardRoutes };
