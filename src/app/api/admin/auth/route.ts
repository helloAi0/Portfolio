import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, signAdminToken } from '@/lib/services/adminAuthService';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Credentials required.' }, { status: 400 });
    }

    const admin = await verifyAdminCredentials(username, password);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

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

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('imperial_admin_token');
  return response;
}

