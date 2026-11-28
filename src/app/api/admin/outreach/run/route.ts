import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
export const dynamic = 'force-dynamic';

let lastRun = 0;
/** Only a trigger: asks n8n to start its scan now. The scan, enrichment, drafting, code gate and approval all stay inside n8n. */
export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = process.env.N8N_RUN_WEBHOOK_URL;
  if (!url) return NextResponse.json({ ok: false, message: 'N8N_RUN_WEBHOOK_URL is not set.' }, { status: 400 });
  if (Date.now() - lastRun < 60_000) return NextResponse.json({ ok: false, message: 'A scan was just requested. Wait a minute.' }, { status: 429 });
  lastRun = Date.now();
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-run-secret': process.env.N8N_RUN_SECRET || '' }, body: JSON.stringify({ source: 'portfolio-admin', requestedAt: new Date().toISOString() }), signal: AbortSignal.timeout(10_000) });
    if (res.status === 401 || res.status === 403) return NextResponse.json({ ok: false, message: 'n8n rejected the request: N8N_RUN_SECRET is missing in n8n or does not match the portfolio value. Nothing was started.' }, { status: 502 });
    return NextResponse.json(res.ok ? { ok: true, message: 'Scan started in n8n. It runs in the background, so this page cannot tell when it finishes; the tables refresh automatically in about 90 seconds (drafts still need your emailed approval).' } : { ok: false, message: `n8n answered HTTP ${res.status}. Is the workflow active?` }, { status: res.ok ? 200 : 502 });
  } catch (e) { return NextResponse.json({ ok: false, message: 'Could not reach n8n: ' + (e as Error).message }, { status: 502 }); }
}
