import { NextRequest, NextResponse } from 'next/server';
import { runAllSyncs } from '@/lib/services/autoSyncService';

/**
 * Reconciliation & Scheduled Sync Endpoint
 * Can be triggered via CRON (e.g. Render Cron Job, GitHub Actions, Vercel Cron)
 * or by calling POST with CRON_SECRET authorization header.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed: without a configured secret nobody can trigger reconciliation.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized reconciliation trigger' }, { status: 401 });
  }

  const out = await runAllSyncs('SCHEDULED');
  return NextResponse.json({ success: !out.skipped, reconciliationTimestamp: new Date().toISOString(), ...out });
}
