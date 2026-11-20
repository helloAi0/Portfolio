import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { sendEmail, ownerRecipient } from '@/lib/lamo/emailAdapter';

export const dynamic = 'force-dynamic';

/** Sends a real test email to the owner and reports exactly what happened (never a fake success). */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const to = ownerRecipient();
  const r = await sendEmail({ to, subject: 'Portfolio email test', text: 'If you can read this, email notifications from your portfolio work.' });
  return NextResponse.json({ success: r.success, to, provider: r.provider, error: r.error ?? null }, { status: r.success ? 200 : 502 });
}
