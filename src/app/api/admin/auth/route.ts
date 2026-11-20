import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, signAdminToken } from '@/lib/services/adminAuthService';

// Brute-force guard: 6 failures per client per 15 minutes (in-memory, per instance).
const fails = new Map<string, { n: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 6;

export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const rec = fails.get(ip);
  if (rec && rec.until > Date.now() && rec.n >= MAX_FAILS) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }
  try {
    const body = await req.json();
    const username = String(body.email ?? body.username ?? '');
    const password = String(body.password ?? '');

    if (!username || !password) {
      return NextResponse.json({ error: 'Credentials required.' }, { status: 400 });
    }

    const admin = await verifyAdminCredentials(username, password);
    if (!admin) {
      const cur = rec && rec.until > Date.now() ? rec : { n: 0, until: Date.now() + WINDOW_MS };
      fails.set(ip, { n: cur.n + 1, until: cur.until });
      return NextResponse.json({ error: 'Invalid credentials. This door opens for the owner only.' }, { status: 401 });
    }
    fails.delete(ip);

    const token = signAdminToken(admin);

    const response = NextResponse.json({ success: true, username: admin.username, role: admin.role });
    response.cookies.set('imperial_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Lets public pages know whether the visitor is the signed-in owner (to show owner-only buttons). Reveals nothing else. */
export async function GET(req: NextRequest) {
  const { getAdminFromRequest } = await import('@/lib/middleware/adminAuth');
  return NextResponse.json({ admin: Boolean(getAdminFromRequest(req)) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('imperial_admin_token');
  return response;
}

