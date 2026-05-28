import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

type PrismaLikeError = {
  code?: string;
  meta?: {
    target?: string[];
  };
};

function isPrismaLikeError(error: unknown): error is PrismaLikeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

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

  if (isPrismaLikeError(error)) {
    if (error.code === 'P2002') {
      const duplicatedFields = error.meta?.target?.join(', ') ?? 'campo unico';
      res.status(409).json({
        message: `Registro duplicado. Verifique o(s) campo(s): ${duplicatedFields}.`,
      });
      return;
    }

    if (error.code === 'P2003') {
      res.status(422).json({
        message: 'Referencia invalida em relacionamento. Verifique IDs enviados.',
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({
        message: 'Registro nao encontrado para a operacao solicitada.',
      });
      return;
    }
  }

  // Log tecnico para facilitar diagnostico sem expor detalhes sensiveis ao frontend.
  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', error);

  res.status(500).json({
    message: 'Erro interno do servidor',
  });
}
