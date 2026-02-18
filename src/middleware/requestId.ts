import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
