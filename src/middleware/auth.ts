import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export type AuthRole = 'admin' | 'customer';

export interface AuthPayload {
  adminId?: string;
  userId?: string;
  email: string;
  role: AuthRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

function setUserFromToken(req: Request, token: string): boolean {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as Record<string, unknown>;
    const email = decoded.email as string;
    if (decoded.adminId) {
      (req as AuthenticatedRequest).user = {
        adminId: decoded.adminId as string,
        email,
        role: 'admin',
      };
      return true;
    }
    if (decoded.userId) {
      (req as AuthenticatedRequest).user = {
        userId: decoded.userId as string,
        email,
        role: 'customer',
      };
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Verifies JWT and sets req.user (admin or customer). */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  if (setUserFromToken(req, token)) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Optionally sets req.user when valid Bearer token is present; never returns 401. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    setUserFromToken(req, authHeader.slice(7));
  }
  next();
}

/** Use after authMiddleware: allows only admin. */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/** Use after authMiddleware: allows only customer. */
export function customerOnly(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'customer') {
    res.status(401).json({ error: 'Please log in to continue' });
    return;
  }
  next();
}
