/**
 * Brings the LOCAL dev database (the wrangler/D1 emulation that `npm run dev` really uses) up to date.
 *   npm run d1:migrate:local   (also runs automatically before `npm run dev`)
 * 1) Normal path: wrangler applies any migrations it has not recorded.
 * 2) If the local database was created some other way (wrangler then fails with "already exists"), the missing migrations are
 *    applied statement by statement, skipping what exists, and recorded, so wrangler stays consistent. Your data is kept.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';

const wr = path.join('node_modules', 'wrangler', 'bin', 'wrangler.js');
const run = spawnSync(process.execPath, [wr, 'd1', 'migrations', 'apply', 'DB', '--local'], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] });
const out = (run.stdout || '') + (run.stderr || '');
if (run.status === 0) { console.log(/No migrations to apply/i.test(out) ? 'Local database is up to date.' : 'Local database updated.'); process.exit(0); }
if (!/already exists|duplicate column/i.test(out)) { process.stderr.write(out); console.error('\nLocal database update failed.'); process.exit(1); }

console.log('Local database was not created by migrations; reconciling it without losing data...');
const dir = path.join('.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite')) : [];
if (!files.length) { console.error('Could not find the local database file under .wrangler.'); process.exit(1); }
const ALREADY = /already exists|duplicate column/i;
for (const f of files) {
  const db = createClient({ url: 'file:' + path.resolve(dir, f) });
  await db.execute('CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)');
  const done = new Set((await db.execute('SELECT name FROM d1_migrations')).rows.map((r) => String(r.name)));
  for (const m of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(m)) continue;
    const sql = fs.readFileSync(path.join('migrations', m), 'utf8');
    // Split on a semicolon at end of line, but never inside a trigger body (BEGIN ... END;).
    const stmts = []; let cur = ''; let inTrigger = false;
    for (const line of sql.split(/\r?\n/)) {
      cur += line + '\n';
      if (/^\s*CREATE\s+TRIGGER/i.test(line)) inTrigger = true;
      if (inTrigger ? /^\s*END\s*;\s*$/i.test(line) : /;\s*$/.test(line)) { stmts.push(cur.trim()); cur = ''; inTrigger = false; }
    }
    if (cur.trim()) stmts.push(cur.trim());
    for (const s of stmts) {
      if (!s.replace(/--[^\n]*/g, '').trim()) continue;
      try { await db.execute(s); } catch (e) { if (!ALREADY.test(e.message)) { console.error(`${m}: ${e.message}`); process.exit(1); } }
    }
    await db.execute({ sql: 'INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)', args: [m] });
    console.log('Applied', m);
  }
}
console.log('Local database updated.');
