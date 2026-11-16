/**
 * Admin Authentication Service
 * JWT-based session management for the admin dashboard.
 * Uses bcryptjs for password hashing (no external auth provider dependency).
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<AdminPayload | null> {
  try {
    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (!admin) return null;

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return null;

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    return { adminId: admin.id, username: admin.username, role: admin.role };
  } catch (err) {
    logger.error('AdminAuth', err as Error);
    return null;
  }
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

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
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
      email: process.env.OWNER_CONTACT_EMAIL || 'tahaudaipurwala68@gmail.com',
      passwordHash: await hashPassword(password),
      role: 'SUPERADMIN',
    },
  });

  logger.info('AdminAuth', 'Admin user created from environment configuration.');
}
