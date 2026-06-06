import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';
  console.error(`[Error] ${status}: ${message}`, err);
  res.status(status).json({
    error: {
      status,
      message,
      code: err.code ?? 'INTERNAL_ERROR',
      ...(config.isDev && { details: err.stack }),
    },
  });
}
