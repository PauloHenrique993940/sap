import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  res.status(500).json({
    message: 'Erro interno do servidor',
  });
}
