import { NextRequest, NextResponse } from 'next/server';
import { requireWorker } from '@/lib/certIngest/internalAuth';
import { claimNext } from '@/lib/certIngest/service';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const denied = requireWorker(req); if (denied) return denied;
  return NextResponse.json(await claimNext());
}
