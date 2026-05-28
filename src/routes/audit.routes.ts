import { Router } from 'express';
import { Role } from '@prisma/client';
import { AuditController } from '../modules/audit/http/audit.controller';
import { asyncHandler } from '../shared/http/async-handler';
import { requireRoles } from '../modules/auth/http/rbac.middleware';

const router = Router();
const controller = new AuditController();

router.get(
  '/timeline',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE, Role.REQUISITANTE]),
  asyncHandler(controller.timeline)
);

export { router as auditRoutes };
