import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../shared/http/async-handler';
import { requireRoles } from '../modules/auth/http/rbac.middleware';
import { validateRequest } from '../shared/validation/validate';
import { MaterialsController } from '../modules/materials/http/materials.controller';
import {
  createMaterialSchema,
  deleteMaterialSchema,
  listMaterialsSchema,
  updateMaterialSchema,
} from '../modules/materials/http/materials.schema';

const router = Router();
const controller = new MaterialsController();

router.get(
  '/',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE, Role.REQUISITANTE]),
  validateRequest(listMaterialsSchema),
  asyncHandler(controller.list)
);

router.post(
  '/',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(createMaterialSchema),
  asyncHandler(controller.create)
);

router.patch(
  '/:id',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(updateMaterialSchema),
  asyncHandler(controller.update)
);

router.delete(
  '/:id',
  requireRoles([Role.ADMIN, Role.GESTOR, Role.ALMOXARIFE]),
  validateRequest(deleteMaterialSchema),
  asyncHandler(controller.remove)
);

export { router as materialsRoutes };
