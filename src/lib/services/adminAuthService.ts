/**
 * Admin Authentication Service
 * JWT-based session management for the admin dashboard.
 * Uses bcryptjs for password hashing (no external auth provider dependency).
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'imperial-lamo-dev-secret-change-in-production';
const JWT_EXPIRY = '8h';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminPayload;
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

  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'imperial-change-me-now';
  const passwordHash = await hashPassword(password);

  await prisma.adminUser.create({
    data: {
      username: 'sahil',
      email: process.env.OWNER_CONTACT_EMAIL || 'admin@projectlamo.local',
      passwordHash,
      role: 'SUPERADMIN',
    },
  });

  logger.info('AdminAuth', 'Default admin user created. Change password immediately.');
}

