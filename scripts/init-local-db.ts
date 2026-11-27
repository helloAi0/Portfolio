/**
 * Creates OR UPGRADES the LOCAL SQLite file from migrations/*.sql (the same files D1 runs).
 *   npm run db:local:init     (uses DATABASE_URL, default file:./dev.db, relative to prisma/)
 * Safe to run any time and runs automatically before `npm run dev`: it applies only the migrations the file is missing,
 * keeps all your data, and recognises databases created before migrations were tracked.
 */
import { nodeDbUrl } from './_nodeDb';
import fs from 'fs';
import { createClient } from '@libsql/client';

const ALREADY = /already exists|duplicate column/i;

(async () => {
  const db = createClient({ url: nodeDbUrl });
  await db.execute('CREATE TABLE IF NOT EXISTS "_local_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)');
  const done = new Set((await db.execute('SELECT name FROM "_local_migrations"')).rows.map((r) => String(r.name)));
  const legacy = Number((await db.execute("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='Profile'")).rows[0].n) > 0 && done.size === 0;
  let applied = 0;
  for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(`migrations/${f}`, 'utf8');
    if (legacy) {
      // Database predates tracking: it may already contain some of this file. Run statement by statement, skipping what exists.
      for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter((s) => s && !/^(--[^\n]*\n?)+$/.test(s))) {
        try { await db.execute(stmt); } catch (e) { if (!ALREADY.test((e as Error).message)) throw e; }
      }
    } else await db.executeMultiple(sql);
    await db.execute({ sql: 'INSERT OR IGNORE INTO "_local_migrations" (name, appliedAt) VALUES (?, ?)', args: [f, new Date().toISOString()] });
    console.log('Applied', f); applied++;
  }
  console.log(applied ? `Local database updated: ${nodeDbUrl}` : `Local database is up to date: ${nodeDbUrl}`);
})().catch((e) => { console.error('Local database update failed:', e.message); process.exit(1); });
