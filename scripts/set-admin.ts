/**
 * Owner-only: create or reset the single admin account from environment variables.
 *   ADMIN_EMAIL              the owner e-mail (the only address that can sign in)
 *   ADMIN_USERNAME           optional, defaults to "taha"
 *   ADMIN_DEFAULT_PASSWORD   12+ characters; read from the environment, never stored in the repo
 * Run: npm run admin:set
 * Any other admin account is removed, so exactly one owner account exists afterwards.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_DEFAULT_PASSWORD || '';
  const username = process.env.ADMIN_USERNAME || 'taha';
  if (!email.includes('@')) throw new Error('Set ADMIN_EMAIL to the owner e-mail first.');
  if (password.length < 12) throw new Error('Set ADMIN_DEFAULT_PASSWORD (12+ characters) first.');
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
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
