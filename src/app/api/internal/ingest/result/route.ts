import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { applyResult } from '@/lib/certIngest/service';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const b = await req.json().catch(() => null);
  if (!b || typeof b.id !== 'string' || !['done', 'ignored', 'failed'].includes(b.outcome)) return NextResponse.json({ error: 'id and outcome required' }, { status: 400 });
  const r: any = await applyResult(b);
  return NextResponse.json(r, { status: r.status ?? (r.ok === false ? 422 : 200) });
}
