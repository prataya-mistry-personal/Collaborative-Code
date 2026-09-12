import type { AuthUser } from '../middleware/auth.js';

// Augment Express's Request so `req.user` is typed everywhere the auth
// middleware has populated it — no per-route casts needed.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
