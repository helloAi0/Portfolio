import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { queueStats } from '@/lib/certIngest/service';
export const dynamic = 'force-dynamic';

/** "Sync LIMO Now": asks the Gmail worker to poll, then to process a queued email. The worker does all heavy work; this route only relays. */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const base = (process.env.INGEST_WORKER_URL || '').replace(/\/$/, ''), secret = process.env.INGEST_SECRET;
  if (!base || !secret) return NextResponse.json({ error: 'The certificate worker is not connected yet. Set INGEST_WORKER_URL and INGEST_SECRET (see worker/README.md).', queue: await queueStats() }, { status: 503 });
  const call = (path: string, ms: number) => fetch(`${base}${path}`, { method: 'POST', headers: { 'X-Internal-Secret': secret }, signal: AbortSignal.timeout(ms) }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) })).catch((e) => ({ ok: false, body: { error: e.name === 'TimeoutError' ? 'The worker is waking up; try again in a minute.' : 'The worker could not be reached.' } }));
  const poll = await call('/ingest/poll-gmail', 25000);
  const next = poll.ok ? await call('/ingest/process-next', 25000) : null;
  return NextResponse.json({ success: poll.ok, poll: poll.body, processed: next?.body ?? null, queue: await queueStats() }, { status: poll.ok ? 200 : 502 });
}
