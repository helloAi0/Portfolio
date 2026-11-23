/**
 * Admin Authentication Service
 * JWT-based session management for the admin dashboard.
 * Passwords are hashed with PBKDF2-SHA256 through Web Crypto, which runs natively on Cloudflare Workers and in Node.
 */

import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const JWT_EXPIRY = '8h';

/**
 * The signing secret must come from the environment. There is deliberately no
 * hardcoded production fallback (the repository is public). In local development
 * only, a clearly labelled dev secret is used so the app works out of the box.
 * Resolved lazily so `next build` does not fail when the variable is absent.
 */
function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') return 'local-development-only-secret-do-not-use-in-production';
  throw new Error('ADMIN_JWT_SECRET must be set to a random string of at least 32 characters.');
}

export interface AdminPayload {
  adminId: string;
  username: string;
  role: string;
}

/** The only e-mail address allowed to sign in. Set ADMIN_EMAIL in the environment. */
export function ownerEmail(): string {
  return (process.env.ADMIN_EMAIL || process.env.OWNER_CONTACT_EMAIL || 'tahaudaipurwala68@gmail.com').trim().toLowerCase();
}

/**
 * Owner-only sign-in. The identifier may be the owner's e-mail or the username, but the matching
 * account must carry the owner e-mail, so no other account can ever open the dashboard.
 */
export async function verifyAdminCredentials(
  identifier: string,
  password: string
): Promise<AdminPayload | null> {
  try {
    const id = String(identifier).trim();
    const lower = id.toLowerCase();
    const owner = ownerEmail();
    let admin = await prisma.adminUser.findFirst({ where: { OR: [{ username: id }, { email: lower }] } });
    if (admin && admin.email.trim().toLowerCase() !== owner) return null;

    let valid = admin ? await verifyPassword(password, admin.passwordHash) : false;

    // The owner keeps the password in ADMIN_DEFAULT_PASSWORD. If the stored hash is out of date
    // (or the account is missing), a sign-in with exactly that value repairs the account.
    if (!valid) {
      const envPw = process.env.ADMIN_DEFAULT_PASSWORD || '';
      const isOwnerId = lower === owner || id === (process.env.ADMIN_USERNAME || 'taha');
      if (isOwnerId && envPw.length >= 12 && safeEqual(password, envPw)) {
        const passwordHash = await hashPassword(envPw);
        admin = admin
          ? await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash } })
          : await prisma.adminUser.create({ data: { username: process.env.ADMIN_USERNAME || 'taha', email: owner, passwordHash, role: 'SUPERADMIN' } });
        valid = true;
      }
    }
    if (!admin || !valid) return null;

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
    return { adminId: admin.id, username: admin.username, role: admin.role };
  } catch (err) {
    logger.error('AdminAuth', err as Error);
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AdminPayload;
  } catch {
    return null;
  }
}

const PBKDF2_ITERATIONS = 100_000; // the maximum Cloudflare Workers allows

const toHex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b as ArrayBuffer), (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256));
}

/** Format: pbkdf2$<iterations>$<salt hex>$<hash hex> */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${await pbkdf2(plain, salt, PBKDF2_ITERATIONS)}`;
}

/** Older bcrypt hashes are not accepted here; the owner's sign-in with ADMIN_DEFAULT_PASSWORD re-creates the hash. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iter || !salt || !hash) return false;
  const got = await pbkdf2(plain, fromHex(salt), Number(iter));
  return got.length === hash.length && safeEqual(got, hash);
}

/**
 * Ensure the default admin user exists. Called during seed / first run.
 * Password is taken from ADMIN_DEFAULT_PASSWORD env var (required in prod).
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await prisma.adminUser.findFirst();
  if (existing) return;

  const password = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!password || password.length < 12) {
    logger.warn('AdminAuth', 'No admin user created: set ADMIN_DEFAULT_PASSWORD (12+ characters).');
    return;
  }

  await prisma.adminUser.create({
    data: {
      username: process.env.ADMIN_USERNAME || 'taha',
      email: ownerEmail(),
      passwordHash: await hashPassword(password),
      role: 'SUPERADMIN',
    },
  });

  logger.info('AdminAuth', 'Admin user created from environment configuration.');
}
