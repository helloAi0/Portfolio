import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { answerCallback, editCard, telegramChatId } from '@/lib/notify/telegram';
import { reviewCertificate } from '@/lib/certIngest/service';
import { setJobStatus } from '@/lib/jobs/service';
export const dynamic = 'force-dynamic';
const h = (s: string) => createHash('sha256').update(s).digest();

/**
 * Telegram inline-button callbacks. Two locks: Telegram's secret-token header AND the owner's chat id.
 * Buttons can only approve/reject drafts or mark a job; nothing here can submit an application or send an email.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!secret || secret.length < 16 || !timingSafeEqual(h(secret), h(got))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const u: any = await req.json().catch(() => null); const cb = u?.callback_query;
  if (!cb) return NextResponse.json({ ok: true });
  if (String(cb.message?.chat?.id) !== String(telegramChatId())) return NextResponse.json({ ok: true }); // ignore anyone else
  const [kind, action, id] = String(cb.data || '').split(':');
  let result = 'Unknown action.';
  try {
    if (kind === 'cert' && (action === 'approve' || action === 'reject') && id) { await reviewCertificate(id, action === 'approve' ? 'approved' : 'rejected'); result = action === 'approve' ? 'Approved: now live.' : 'Rejected.'; }
    else if (kind === 'mail' && (action === 'approve' || action === 'reject') && id) { await prisma.coldEmailDraft.update({ where: { id }, data: { status: action === 'approve' ? 'approved' : 'rejected' } }); result = action === 'approve' ? 'Approved. Send it yourself from Admin → Outreach.' : 'Rejected.'; }
    else if (kind === 'job' && (action === 'applied' || action === 'skipped') && id) { await setJobStatus(id, action.toUpperCase()); result = action === 'applied' ? 'Marked as applied.' : 'Skipped (the agent learns from this).'; }
  } catch { result = 'That item no longer exists.'; }
  await answerCallback(cb.id, result);
  if (cb.message?.message_id) await editCard(cb.message.chat.id, cb.message.message_id, `${(cb.message.text || '').split('\n')[0]}\n${result}`);
  return NextResponse.json({ ok: true });
}
