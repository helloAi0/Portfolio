import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { enqueue } from '@/lib/certIngest/service';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) return NextResponse.json({ error: 'messages[] required' }, { status: 400 });
  return NextResponse.json(await enqueue(body.messages));
}
