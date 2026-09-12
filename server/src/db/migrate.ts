import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Apply migrations. The SQL is idempotent (IF NOT EXISTS / OR REPLACE),
// so this is safe to run on every boot and on already-migrated databases.
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Running migrations...');

    const migrationPath = join(__dirname, 'migrations', '001_create_tables.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// CLI entry point (`npm run migrate --workspace=server`)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
