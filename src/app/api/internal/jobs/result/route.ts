import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { recordPrefill } from '@/lib/jobs/prefill';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const b = await req.json().catch(() => null); if (!b || typeof b.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });
  const r = await recordPrefill(b); return NextResponse.json(r, { status: 'error' in r ? 404 : 200 });
}
