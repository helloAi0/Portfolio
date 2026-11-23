/**
 * Creates the LOCAL SQLite file used by Node scripts (seed, backup, tests) from migrations/*.sql.
 *   npm run db:local:init     (uses DATABASE_URL, default file:./dev.db, relative to prisma/)
 * Skips if the file already has tables.
 */
import { nodeDbUrl } from './_nodeDb';
import fs from 'fs';
import { createClient } from '@libsql/client';

(async () => {
  const db = createClient({ url: nodeDbUrl });
  const existing = await db.execute("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='Profile'");
  if (Number(existing.rows[0].n) > 0) { console.log('Local database already initialised:', nodeDbUrl); return; }
  for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    await db.executeMultiple(fs.readFileSync(`migrations/${f}`, 'utf8'));
    console.log('Applied', f);
  }
  console.log('Local database ready:', nodeDbUrl);
})().catch((e) => { console.error('Init failed:', e.message); process.exit(1); });
