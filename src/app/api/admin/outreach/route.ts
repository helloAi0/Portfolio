import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { draftColdEmail, EMAIL_RE, wordCount } from '@/lib/outreach/draft';
import { MAX_WORDS } from '@/config/outreach';
import { background } from '@/lib/background';
import { mailCard } from '@/lib/notify/telegram';
export const dynamic = 'force-dynamic';
const unauth = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  return NextResponse.json({ data: await prisma.coldEmailDraft.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }), maxWords: MAX_WORDS });
}

/** Creates a DRAFT only. Nothing is ever sent from here. */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return unauth();
  const b = await req.json().catch(() => ({}));
  const to = s(b.recipientEmail, 200), company = s(b.companyOrLab, 120), name = s(b.recipientName, 80);
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
  if (!company) return NextResponse.json({ error: 'Enter the company or lab name.' }, { status: 400 });
  const d = draftColdEmail({ recipientName: name, companyOrLab: company, focus: s(b.focus, 300) });
  const row = await prisma.coldEmailDraft.create({ data: { recipientName: name || 'there', recipientEmail: to, companyOrLab: company, subject: d.subject, body: d.body, focus: s(b.focus, 300) } });
  background(mailCard({ id: row.id, to, company, subject: d.subject }));
  return NextResponse.json({ success: true, draft: row, words: wordCount(d.body), project: d.project });
}
