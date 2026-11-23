/**
 * Owner-only: create or reset the single admin account from environment variables.
 *   ADMIN_EMAIL              the owner e-mail (the only address that can sign in)
 *   ADMIN_USERNAME           optional, defaults to "taha"
 *   ADMIN_DEFAULT_PASSWORD   12+ characters; read from the environment, never stored in the repo
 * Run: npm run admin:set
 * Any other admin account is removed, so exactly one owner account exists afterwards.
 */
import { nodePrisma } from './_nodeDb';
import { hashPassword } from '../src/lib/services/adminAuthService';

function loadDotEnv() {
  try {
    const fs = require('fs');
    for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch { /* no .env file: rely on the real environment */ }
}

async function main() {
  loadDotEnv();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || '';
  const username = process.env.ADMIN_USERNAME || 'taha';
  if (!email.includes('@')) throw new Error('Set ADMIN_EMAIL to the owner e-mail first.');
  if (password.length < 12) throw new Error('Set ADMIN_DEFAULT_PASSWORD (12+ characters) first.');
  const prisma = nodePrisma;
  try {
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.deleteMany({ where: { NOT: { email } } });
    await prisma.adminUser.upsert({
      where: { email },
      update: { username, passwordHash, role: 'SUPERADMIN' },
      create: { username, email, passwordHash, role: 'SUPERADMIN' },
    });
    console.log(`Owner account ready for ${email}. Sign in at /admin/login.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
