import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error';

const validRoles = new Set<Role>([
  Role.ADMIN,
  Role.GESTOR,
  Role.ALMOXARIFE,
  Role.REQUISITANTE,
]);

export function mockAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const userId = req.header('x-user-id');
  const roleHeader = req.header('x-user-role') as Role | undefined;

  if (!userId || !roleHeader || !validRoles.has(roleHeader)) {
    throw new AppError('Cabecalhos de autenticacao invalidos', 401);
  }

  req.user = {
    id: userId,
    role: roleHeader,
  };

  next();
}
