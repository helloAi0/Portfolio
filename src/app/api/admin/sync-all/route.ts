import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/middleware/adminAuth';
import { runAllSyncs, lastRun } from '@/lib/services/autoSyncService';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const out = await runAllSyncs('MANUAL');
  return NextResponse.json({ success: !out.skipped, ...out });
}
export async function GET(req: NextRequest) {
  if (!getAdminFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ lastRun, intervalHours: Number(process.env.AUTO_SYNC_INTERVAL_HOURS ?? 6), enabled: process.env.AUTO_SYNC_ENABLED !== 'false' });
}
