// Builds a fresh SQLite file from migrations/*.sql (what D1 would run). Usage: node scripts/_applyMigrations.mjs prisma/test.db
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@libsql/client');
const file = process.argv[2] || 'prisma/test.db'; fs.rmSync(file, { force: true });
const db = createClient({ url: 'file:' + file });
for (const f of fs.readdirSync('migrations').filter((x) => x.endsWith('.sql')).sort()) await db.executeMultiple(fs.readFileSync(`migrations/${f}`, 'utf8'));
console.log(`built ${file} from migrations`);
