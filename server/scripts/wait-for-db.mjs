import net from 'node:net';

const host = process.env.DB_HOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || 5432);
const timeoutMs = 60_000;

// localhost may resolve to IPv6 first while Postgres also listens on IPv4,
// so probe a few candidates and proceed as soon as one accepts a connection.
const hosts = [...new Set([host, '127.0.0.1', '::1'])];

const startedAt = Date.now();

function tryHosts() {
  for (const candidate of hosts) {
    const socket = net.connect({ host: candidate, port });
    socket.once('connect', () => {
      socket.destroy();
      console.log(`[db] PostgreSQL is ready on ${candidate}:${port}`);
      process.exit(0);
    });
    socket.once('error', () => socket.destroy());
  }
  retry();
}

function retry() {
  if (Date.now() - startedAt > timeoutMs) {
    console.error(`[db] Timed out waiting for PostgreSQL on port ${port}. Is it running?`);
    process.exit(1);
  }
  setTimeout(tryHosts, 300);
}

tryHosts();
