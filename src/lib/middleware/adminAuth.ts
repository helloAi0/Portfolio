/**
 * Admin authentication middleware
 * Reads the imperial_admin_token cookie and verifies JWT.
 */

import { NextRequest } from 'next/server';
import { verifyAdminToken, type AdminPayload } from '@/lib/services/adminAuthService';

export function getAdminFromRequest(req: NextRequest): AdminPayload | null {
  const token = req.cookies.get('imperial_admin_token')?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function requireAdmin(req: NextRequest): AdminPayload {
  const admin = getAdminFromRequest(req);
  if (!admin) throw new Error('UNAUTHORIZED');
  return admin;
}

