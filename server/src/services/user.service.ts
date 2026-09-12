import { pool } from '../db/index.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  created_at: Date;
}
export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.username}`;

  const result = await pool.query(
    `INSERT INTO users (id, username, email, password_hash, avatar_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, avatar_url, created_at`,
    [uuidv4(), input.username, input.email, passwordHash, avatarUrl]
  );

  return result.rows[0];
}

export async function getUserByEmail(email: string): Promise<User & { password_hash: string } | null> {
  const result = await pool.query(
    `SELECT id, username, email, password_hash, avatar_url, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT id, username, email, avatar_url, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  
  if (updates.username) {
    fields.push(`username = $${idx++}`);
    values.push(updates.username);
  }
  
  if (updates.avatar_url) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(updates.avatar_url);
  }
  
  if (fields.length === 0) {
    return getUserById(id);
  }
  
  values.push(id);
  
  const result = await pool.query(
    `UPDATE users
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${idx}
     RETURNING id, username, email, avatar_url, created_at`,
    values
  );
  
  return result.rows[0] || null;
}
