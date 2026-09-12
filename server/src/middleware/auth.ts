import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

function extractToken(req: Request): string | undefined {
  return req.cookies?.token || req.headers.authorization?.split(' ')[1];
}

function verifyToken(token: string): AuthUser {
  return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
}

/** Require a valid token; responds 401 otherwise. Populates `req.user`. */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    res.status(401).json({ error: expired ? 'Token expired' : 'Invalid token' });
  }
}

/** Populate `req.user` if a valid token is present; never blocks the request. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Invalid token — continue unauthenticated.
    }
  }
  next();
}
