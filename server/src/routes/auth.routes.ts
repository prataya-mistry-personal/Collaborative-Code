import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail, getUserById, verifyPassword } from '../services/user.service.js';
import type { User } from '../services/user.service.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();

type TokenUser = Pick<User, 'id' | 'username' | 'email'>;

function generateToken(user: TokenUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET!,
    // @types/jsonwebtoken types `expiresIn` as a template-literal union; env
    // values are plain strings, so we assert the options shape.
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

function toPublicUser(user: User) {
  return { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url };
}

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new HttpError(400, 'Username, email, and password are required');
  }
  if (password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  // A duplicate username/email hits the DB unique constraint and surfaces as a
  // 409 via the central error handler (no check-then-insert race).
  const user = await createUser({ username, email, password });

  res.status(201).json({
    message: 'User created successfully',
    token: generateToken(user),
    user: toPublicUser(user),
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required');
  }

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid credentials');
  }

  res.json({
    message: 'Login successful',
    token: generateToken(user),
    user: toPublicUser(user),
  });
}));

// Get current user (re-read from the DB so the response is fresh and shaped
// like login/register, not the raw JWT payload).
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  res.json({ user: toPublicUser(user) });
}));

export default router;
