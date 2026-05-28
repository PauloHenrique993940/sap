import { Request } from 'express';
import { Role } from '@prisma/client';

export type RequestUser = {
  id: string;
  role: Role;
};

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export type AuthenticatedRequest = Request & {
  user: RequestUser;
};

export {};
