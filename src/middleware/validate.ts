import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { validationError } from '../utils/apiResponse';
import { parseObjectId } from '../utils/objectId';
import { AppError } from './errorHandler';

type ParseTarget = 'body' | 'query';

function getParseTarget(req: Request, target: ParseTarget): unknown {
  return target === 'body' ? req.body : req.query;
}

function setValidated(req: Request, target: ParseTarget, data: unknown): void {
  (req as Request & { validatedBody?: unknown; validatedQuery?: unknown })[
    target === 'body' ? 'validatedBody' : 'validatedQuery'
  ] = data;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(getParseTarget(req, 'body'));
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      validationError(res, details);
      return;
    }
    setValidated(req, 'body', result.data);
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(getParseTarget(req, 'query'));
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      validationError(res, details);
      return;
    }
    setValidated(req, 'query', result.data);
    next();
  };
}

/** Middleware: ensure req.params[paramKey] is a valid MongoDB ObjectId; calls next(AppError(400)) if not. */
export function validateParamId(paramKey = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramKey];
    if (!id) {
      next(new AppError(400, 'Missing ID'));
      return;
    }
    try {
      parseObjectId(id, `Invalid ${paramKey}`);
    } catch (err) {
      next(err);
      return;
    }
    next();
  };
}
