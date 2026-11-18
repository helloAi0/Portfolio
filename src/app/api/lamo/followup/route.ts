import { NextRequest, NextResponse } from 'next/server';
import { attachVisitorFollowUp } from '@/lib/lamo/unansweredService';
import { RateLimiter, getClientIp } from '@/lib/lamo/security';

export const dynamic = 'force-dynamic';
const limiter = new RateLimiter(60_000, 5);

export async function POST(req: NextRequest) {
  if (!limiter.allow(getClientIp(req.headers.get('x-forwarded-for')))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { questionId, followUpToken, visitorEmail, visitorName } = body ?? {};
  if (typeof questionId !== 'string' || !/^LQ-\d{4}-[A-Z0-9]{6}$/.test(questionId) || typeof followUpToken !== 'string') {
    return NextResponse.json({ error: 'A valid question reference is required.' }, { status: 400 });
  }
  const res = await attachVisitorFollowUp(questionId, followUpToken, visitorName, visitorEmail);
  if (!res.success) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ success: true, message: 'Thanks. Your email is linked to this question so the owner can follow up.' });
}
