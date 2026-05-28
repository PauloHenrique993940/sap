import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../../../shared/errors/app-error';

export function requireRoles(allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      throw new AppError('Acesso negado', 403);
    }

    next();
  };
}
