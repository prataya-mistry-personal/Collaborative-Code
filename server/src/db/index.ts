import '../env.js';
import { Pool, PoolConfig } from 'pg';

// Single source of truth for connection settings, reused by migrate/seed.
export const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'collab_code',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// Without a listener, an error on an idle client (e.g. the DB restarting)
// is thrown as an uncaught exception and crashes the process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});
