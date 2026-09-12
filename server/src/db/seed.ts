import bcrypt from 'bcrypt';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

// Seed demo data. Safe to re-run (ON CONFLICT DO NOTHING).
export async function runSeed(): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('Seeding database...');

    // Hash password for test user
    const passwordHash = await bcrypt.hash('password123', 10);

    // Insert test user
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, username, email`,
      ['testuser', 'test@example.com', passwordHash, 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser']
    );

    if (userResult.rows.length > 0) {
      console.log('✅ Created test user:', userResult.rows[0]);
    } else {
      console.log('ℹ️  Test user already exists');
    }

    // Insert test room
    const roomResult = await client.query(
      `INSERT INTO rooms (name, code, owner_id, language, is_public)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO NOTHING
       RETURNING id, name, code`,
      ['Demo Room', 'DEMO123', userResult.rows[0]?.id || null, 'javascript', true]
    );

    if (roomResult.rows.length > 0) {
      console.log('✅ Created demo room:', roomResult.rows[0]);
    } else {
      console.log('ℹ️  Demo room already exists');
    }

    console.log('✅ Seeding completed!');
    console.log('\n📝 Test credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Room Code: DEMO123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// CLI entry point (`npm run seed --workspace=server`)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSeed()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
