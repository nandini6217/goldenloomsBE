import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof Error && err.message.startsWith('Only images')) {
    res.status(400).json({ error: err.message });
    return;
  }
  const requestId = (_req as Request & { requestId?: string }).requestId;
  logger.error('Unhandled error', { requestId, err: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ error: 'Internal server error' });
}
