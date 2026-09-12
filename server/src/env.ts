import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));

// Load environment variables before anything reads process.env.
// ESM imports are evaluated before module bodies, so this module must be
// imported first wherever env-dependent config lives (e.g. db/index.ts).
// A server-local `.env` wins; the repo-root `.env` fills in the rest
// (dotenv never overwrites variables that are already set).
for (const candidate of [join(dir, '../.env'), join(dir, '../../.env')]) {
  if (existsSync(candidate)) dotenv.config({ path: candidate });
}
