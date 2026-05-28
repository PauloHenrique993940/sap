import { Router } from 'express';
import { Role } from '@prisma/client';
import { RequestController } from '../modules/requests/http/request.controller';
import { asyncHandler } from '../shared/http/async-handler';
import { requireRoles } from '../modules/auth/http/rbac.middleware';
import { validateRequest } from '../shared/validation/validate';
import {
  createRequestSchema,
  decideRequestSchema,
  deliverRequestItemSchema,
  reserveRequestItemSchema,
} from '../modules/requests/http/request.schema';

const router = Router();
const controller = new RequestController();

router.get(
  '/',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE, Role.REQUISITANTE]),
  asyncHandler(controller.list)
);

router.post(
  '/',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE, Role.REQUISITANTE]),
  validateRequest(createRequestSchema),
  asyncHandler(controller.create)
);

router.patch(
  '/:requestId/decision',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(decideRequestSchema),
  asyncHandler(controller.decide)
);

router.post(
  '/:requestId/items/:itemId/reserve',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(reserveRequestItemSchema),
  asyncHandler(controller.reserveItem)
);

router.post(
  '/:requestId/items/:itemId/deliver',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(deliverRequestItemSchema),
  asyncHandler(controller.deliverItem)
);

export { router as requestRoutes };
