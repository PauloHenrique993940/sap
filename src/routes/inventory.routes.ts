import { Router } from 'express';
import { Role } from '@prisma/client';
import { InventoryController } from '../modules/inventory/http/inventory.controller';
import { asyncHandler } from '../shared/http/async-handler';
import { requireRoles } from '../modules/auth/http/rbac.middleware';
import { validateRequest } from '../shared/validation/validate';
import {
  listStockSchema,
  receiveStockSchema,
  transferStockSchema,
} from '../modules/inventory/http/inventory.schema';

const router = Router();
const controller = new InventoryController();

router.post(
  '/receipts',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(receiveStockSchema),
  asyncHandler(controller.receive)
);

router.post(
  '/transfers',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(transferStockSchema),
  asyncHandler(controller.transfer)
);

router.get(
  '/stocks',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE, Role.REQUISITANTE]),
  validateRequest(listStockSchema),
  asyncHandler(controller.listStocks)
);

export { router as inventoryRoutes };
