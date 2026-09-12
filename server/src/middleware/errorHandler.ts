import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Error thrown by route handlers for expected failures (400/401/404/409...).
 * Anything else that reaches `errorHandler` is treated as an unexpected 500.
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Wraps an async route handler so rejected promises are forwarded to Express's
 * error middleware instead of hanging the request. Lets handlers `throw` and
 * skip the repetitive per-route `try/catch`.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/**
 * Central Express error handler. Maps known error shapes to clean responses
 * and never leaks internal messages/stack traces to clients.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Expected, handler-thrown errors.
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Postgres unique-violation → 409 with a friendly, field-specific message.
  if (err?.code === '23505') {
    const field = err.constraint?.includes('email')
      ? 'Email'
      : err.constraint?.includes('username')
      ? 'Username'
      : 'Value';
    res.status(409).json({ error: `${field} already in use` });
    return;
  }

  // Postgres invalid text representation (e.g. a malformed UUID) → 400.
  if (err?.code === '22P02') {
    res.status(400).json({ error: 'Invalid request parameter' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
