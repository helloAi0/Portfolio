import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { prisma } from '@/lib/prisma';
import { EMAIL_RE, wordCount } from '@/lib/outreach/draft';
import { MAX_WORDS } from '@/config/outreach';
export const dynamic = 'force-dynamic';
const STATUSES = ['pending_approval', 'approved', 'sent', 'rejected'];

/** `sent` can only follow `approved`, and only the owner can set it (after sending the mail himself). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const cur = await prisma.coldEmailDraft.findUnique({ where: { id: params.id } });
  if (!cur) return NextResponse.json({ error: 'That draft no longer exists.' }, { status: 404 });
  if (b.status !== undefined && !STATUSES.includes(b.status)) return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  if (b.status === 'sent' && cur.status !== 'approved') return NextResponse.json({ error: 'Approve the draft before marking it as sent.' }, { status: 400 });
  const edited = b.body !== undefined || b.subject !== undefined || b.recipientEmail !== undefined;
  if (b.recipientEmail !== undefined && !EMAIL_RE.test(String(b.recipientEmail).trim())) return NextResponse.json({ error: 'Enter a valid recipient email address.' }, { status: 400 });
  if (typeof b.body === 'string' && wordCount(b.body) > MAX_WORDS) return NextResponse.json({ error: `Keep it under ${MAX_WORDS} words (now ${wordCount(b.body)}).` }, { status: 400 });
  const row = await prisma.coldEmailDraft.update({ where: { id: params.id }, data: {
    ...(typeof b.subject === 'string' && { subject: b.subject.trim().slice(0, 200) }), ...(typeof b.body === 'string' && { body: b.body.slice(0, 4000) }),
    ...(typeof b.recipientEmail === 'string' && { recipientEmail: b.recipientEmail.trim() }), ...(typeof b.recipientName === 'string' && { recipientName: b.recipientName.trim().slice(0, 80) }),
    // Editing an approved draft sends it back for approval: what was approved must be what is sent.
    ...(b.status ? { status: b.status } : edited && cur.status === 'approved' ? { status: 'pending_approval' } : {}) } });
  return NextResponse.json({ success: true, draft: row });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.coldEmailDraft.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
