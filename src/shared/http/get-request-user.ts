import { Request } from 'express';
import { AppError } from '../errors/app-error';
import { RequestUser } from './request-user';

export function getRequestUser(req: Request): RequestUser {
  if (!req.user) {
    throw new AppError('Usuario nao autenticado', 401);
  }

  return req.user;
}
