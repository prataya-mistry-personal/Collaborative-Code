import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'child_process';
import net from 'net';
import { existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import '../src/env.js';
import { pool } from '../src/db/index.js';
import { runMigrations } from '../src/db/migrate.js';
import { runSeed } from '../src/db/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The cluster lives in a gitignored folder at the repo root.
// Delete it to completely reset the database.
const dataDir = join(__dirname, '..', '..', '.pgdata');
const seededMarker = join(dataDir, '.seeded');

const port = parseInt(process.env.DB_PORT || '5432', 10);
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';
const database = process.env.DB_NAME || 'collab_code';

function isPortOpen(host: string, portNumber: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const socket = net.connect({ host, port: portNumber });
    socket.once('connect', () => {
      socket.destroy();
      resolvePromise(true);
    });
    socket.once('error', () => resolvePromise(false));
  });
}

// Resolve pg_ctl from the platform-specific @embedded-postgres package,
// so `stop` works even when the database was started by another process.
async function resolvePgCtl(): Promise<string> {
  const pkg =
    process.platform === 'win32'
      ? '@embedded-postgres/windows-x64'
      : process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? '@embedded-postgres/darwin-arm64'
          : '@embedded-postgres/darwin-x64'
        : process.arch === 'arm64'
          ? '@embedded-postgres/linux-arm64'
          : '@embedded-postgres/linux-x64';
  const mod = (await import(pkg)) as { pg_ctl: string };
  return mod.pg_ctl;
}

async function start(): Promise<void> {
  if (await isPortOpen('127.0.0.1', port)) {
    throw new Error(
      `Port ${port} is already in use. Another PostgreSQL instance is probably running ` +
        `(Docker: run "docker-compose down", or native: run "npm run db:stop").`
    );
  }

  // A PG_VERSION file means the cluster was initialised before.
  const fresh = !existsSync(join(dataDir, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user,
    password,
    persistent: true,
    onLog: (message) => process.stdout.write(`[pg] ${message}`),
  });

  if (fresh) {
    console.log(`Initialising PostgreSQL cluster in ${dataDir} (first run)...`);
    await pg.initialise();
  }

  await pg.start();
  console.log(`✅ PostgreSQL listening on localhost:${port} (data: ${dataDir})`);

  if (fresh) {
    console.log(`Creating database "${database}"...`);
    await pg.createDatabase(database);
  }

  // Migrations are idempotent, so they run on every start to pick up
  // schema changes. Seeding happens only until it has succeeded once.
  await runMigrations();
  if (!existsSync(seededMarker)) {
    await runSeed();
    writeFileSync(seededMarker, '');
  }
  await pool.end();

  console.log('Press Ctrl+C to stop.');
  // Keep this process alive: the database is automatically shut down
  // when it exits.
  setInterval(() => {}, 1 << 30);
}

async function stop(): Promise<void> {
  const pgCtl = await resolvePgCtl();
  const code = await new Promise<number | null>((resolvePromise) => {
    const child = spawn(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast'], { stdio: 'inherit' });
    child.once('close', (exitCode) => resolvePromise(exitCode));
    child.once('error', (error) => {
      console.error(error);
      resolvePromise(1);
    });
  });
  if (code === 0) {
    console.log('✅ PostgreSQL stopped (data is preserved).');
  } else {
    console.log('ℹ️  PostgreSQL does not appear to be running.');
  }
}

const command = process.argv[2];

if (command === 'start') {
  start().catch((err) => {
    console.error('❌ Failed to start PostgreSQL:', err.message);
    process.exit(1);
  });
} else if (command === 'stop') {
  stop().catch((err) => {
    console.error('❌ Failed to stop PostgreSQL:', err.message);
    process.exit(1);
  });
} else {
  console.error('Usage: tsx scripts/pg.ts <start|stop>');
  process.exit(1);
}
