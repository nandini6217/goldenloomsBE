import { Request, Response, NextFunction } from 'express';

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | unknown>;

/** Wraps async route handlers so errors are passed to next() and handled by errorHandler. */
export function asyncHandler(fn: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
